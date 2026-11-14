// SPDX-License-Identifier: MIT
pragma solidity >=0.8.0;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "./reactive-lib/abstract-base/AbstractCallback.sol";

interface IMockDEX {
    function swap(
        address tokenIn,
        address tokenOut,
        uint256 amountIn,
        address recipient
    ) external returns (uint256 amountOut);
}

/**
 * @title PaycheckVault
 * @notice Recipient-side autonomous Multi-Bucket Stablecoin & Treasury Vault on Base Sepolia.
 *         Receives authenticated cross-chain callbacks from Reactive Network (Lasna)
 *         when volatile inflows arrive on Sepolia, splitting value into:
 *           1. Core Stablecoin Reserve (e.g. USDC for tax/runway protection)
 *           2. Yield Stablecoin Vault (e.g. sUSDC for idle yield)
 *           3. Retained Operating Asset (kept liquid in inputToken)
 *         Enforces single-callback cap and slippage floor guardrails.
 */
contract PaycheckVault is AbstractCallback {
    using SafeERC20 for IERC20;

    address public owner;
    address public dexRouter;
    address public inputToken;          // Operating / volatile inflow token (e.g. WETH)
    address public stableToken;         // Bucket 1: Core stablecoin reserve (e.g. USDC)
    address public yieldToken;          // Bucket 2: Yield-bearing stablecoin (e.g. sUSDC)

    uint256 public stableBps;           // e.g. 5000 = 50% swapped to Core Stablecoin
    uint256 public yieldBps;            // e.g. 3000 = 30% swapped to Yield Stablecoin
                                        // Remaining (10000 - stableBps - yieldBps) retained in inputToken

    // On-chain risk guardrails
    uint256 public maxSingleAllocation; // Max inputToken processed per callback (0 = uncapped)
    uint256 public minStableOutPerInput;// Minimum stable output per 1e18 inputToken (slippage floor, 0 = disabled)

    event PaycheckAllocated(
        address indexed caller,
        uint256 amountIn,
        uint256 amountOut,
        uint256 timestamp
    );

    event MultiBucketAllocated(
        address indexed caller,
        uint256 totalProcessed,
        uint256 stableOut,
        uint256 yieldOut,
        uint256 retainedIn,
        uint256 timestamp
    );

    event ConfigUpdated(
        address indexed dexRouter,
        address indexed inputToken,
        address indexed targetToken,
        uint256 allocationBps
    );

    event BucketsUpdated(
        uint256 stableBps,
        uint256 yieldBps,
        uint256 retainedBps
    );

    event GuardrailsUpdated(
        uint256 maxSingleAllocation,
        uint256 minStableOutPerInput
    );

    event Withdrawn(
        address indexed token,
        address indexed to,
        uint256 amount
    );

    modifier onlyOwner() {
        require(msg.sender == owner, "Only owner");
        _;
    }

    constructor(
        address _callbackSender,
        address _dexRouter,
        address _inputToken,
        address _stableToken,
        address _yieldToken,
        uint256 _stableBps,
        uint256 _yieldBps
    ) AbstractCallback(_callbackSender) payable {
        require(_stableBps + _yieldBps <= 10000, "Invalid bps");
        owner = msg.sender;
        dexRouter = _dexRouter;
        inputToken = _inputToken;
        stableToken = _stableToken;
        yieldToken = _yieldToken;
        stableBps = _stableBps;
        yieldBps = _yieldBps;
    }

    /**
     * @notice Total basis points converted into stablecoin buckets (for compatibility with v1 readers).
     */
    function allocationBps() external view returns (uint256) {
        return stableBps + yieldBps;
    }

    /**
     * @notice Primary stablecoin reserve token (v1 compatibility view).
     */
    function targetToken() external view returns (address) {
        return stableToken;
    }

    /**
     * @notice Callback invoked exclusively by the Reactive Network relayer.
     *         Authentication is enforced by:
     *         1. authorizedSenderOnly (must be the Base Sepolia Callback Proxy)
     *         2. rvmIdOnly(sender) (must match the authorized deployer wallet RVM ID)
     */
    function executePaycheckAllocation(address sender, uint256 inflowAmount)
        external
        authorizedSenderOnly
        rvmIdOnly(sender)
    {
        uint256 balance = IERC20(inputToken).balanceOf(address(this));
        if (balance == 0 || inflowAmount == 0) return;

        // Guardrail 1: Circuit-breaker cap per callback
        uint256 effectiveInflow = inflowAmount;
        if (maxSingleAllocation > 0 && effectiveInflow > maxSingleAllocation) {
            effectiveInflow = maxSingleAllocation;
        }
        if (effectiveInflow > balance) {
            effectiveInflow = balance;
        }

        uint256 stableIn = (effectiveInflow * stableBps) / 10000;
        uint256 yieldIn = (effectiveInflow * yieldBps) / 10000;
        uint256 retainedIn = effectiveInflow - stableIn - yieldIn;

        uint256 stableOut = 0;
        uint256 yieldOut = 0;

        if (stableIn > 0 && stableToken != address(0)) {
            IERC20(inputToken).forceApprove(dexRouter, stableIn);
            stableOut = IMockDEX(dexRouter).swap(
                inputToken,
                stableToken,
                stableIn,
                address(this)
            );
            if (minStableOutPerInput > 0) {
                uint256 minExpected = (stableIn * minStableOutPerInput) / 1e18;
                require(stableOut >= minExpected, "Slippage exceeded");
            }
        }

        if (yieldIn > 0 && yieldToken != address(0)) {
            IERC20(inputToken).forceApprove(dexRouter, yieldIn);
            yieldOut = IMockDEX(dexRouter).swap(
                inputToken,
                yieldToken,
                yieldIn,
                address(this)
            );
            if (minStableOutPerInput > 0) {
                uint256 minExpectedYield = (yieldIn * minStableOutPerInput) / 1e18;
                require(yieldOut >= minExpectedYield, "Slippage exceeded");
            }
        }

        emit MultiBucketAllocated(
            sender,
            effectiveInflow,
            stableOut,
            yieldOut,
            retainedIn,
            block.timestamp
        );
        emit PaycheckAllocated(
            sender,
            stableIn + yieldIn,
            stableOut + yieldOut,
            block.timestamp
        );
    }

    /**
     * @notice Allows user or employer to deposit inputToken directly on Base Sepolia.
     */
    function deposit(uint256 amount) external {
        require(amount > 0, "Zero deposit");
        IERC20(inputToken).safeTransferFrom(msg.sender, address(this), amount);
    }

    /**
     * @notice Update multi-bucket stablecoin allocation percentages (total <= 10000 bps).
     */
    function setBuckets(uint256 _stableBps, uint256 _yieldBps) external onlyOwner {
        require(_stableBps + _yieldBps <= 10000, "Invalid bps");
        stableBps = _stableBps;
        yieldBps = _yieldBps;
        emit BucketsUpdated(_stableBps, _yieldBps, 10000 - _stableBps - _yieldBps);
    }

    /**
     * @notice Configure on-chain per-callback cap and slippage floor guardrails.
     */
    function setGuardrails(
        uint256 _maxSingleAllocation,
        uint256 _minStableOutPerInput
    ) external onlyOwner {
        maxSingleAllocation = _maxSingleAllocation;
        minStableOutPerInput = _minStableOutPerInput;
        emit GuardrailsUpdated(_maxSingleAllocation, _minStableOutPerInput);
    }

    /**
     * @notice Legacy single-target configuration update (maps allocation to Core Stablecoin bucket).
     */
    function setConfig(
        address _dexRouter,
        address _inputToken,
        address _targetToken,
        uint256 _allocationBps
    ) external onlyOwner {
        require(_allocationBps <= 10000, "Invalid bps");
        dexRouter = _dexRouter;
        inputToken = _inputToken;
        stableToken = _targetToken;
        stableBps = _allocationBps;
        yieldBps = 0;
        emit ConfigUpdated(_dexRouter, _inputToken, _targetToken, _allocationBps);
        emit BucketsUpdated(_allocationBps, 0, 10000 - _allocationBps);
    }

    /**
     * @notice Non-custodial owner withdrawal of any bucket token from the vault.
     */
    function withdraw(address token, uint256 amount) external onlyOwner {
        require(amount > 0, "Zero withdraw");
        IERC20(token).safeTransfer(owner, amount);
        emit Withdrawn(token, owner, amount);
    }

    /**
     * @notice Returns the authorized Reactive VM ID bound to this callback contract.
     */
    function getRvmId() external view returns (address) {
        return rvm_id;
    }
}

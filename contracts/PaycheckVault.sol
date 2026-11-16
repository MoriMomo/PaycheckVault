// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import { IPayable } from "./reactive-lib-omni/interfaces/IPayable.sol";
import { AbstractCallback } from "./reactive-lib-omni/base/AbstractCallback.sol";

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
 * @notice Multi-User Autonomous Stablecoin & Treasury Vault on Base Sepolia (Reactive Omni).
 *         Isolates balances and allocation rules per wallet address so any connected user can
 *         deposit WETH, customize their own split and risk limits, receive automated callbacks
 *         from Lasna PaycheckReactive, and withdraw their own bucket tokens.
 */
contract PaycheckVault is AbstractCallback {
    using SafeERC20 for IERC20;

    struct Policy {
        uint256 stableBps;
        uint256 yieldBps;
        uint256 maxSingleAllocation;
        uint256 minStableOutPerInput;
        bool configured;
    }

    struct UserLedger {
        uint256 weth;
        uint256 usdc;
        uint256 sUsdc;
    }

    address public owner;
    address public dexRouter;
    address public inputToken;          // Operating / volatile inflow token (e.g. WETH)
    address public stableToken;         // Bucket 1: Core stablecoin reserve (e.g. USDC)
    address public yieldToken;          // Bucket 2: Yield-bearing stablecoin (e.g. sUSDC)

    // Default split and guardrails applied for users who have not yet set custom rules
    uint256 public defaultStableBps;
    uint256 public defaultYieldBps;
    uint256 public defaultMaxSingleAllocation;
    uint256 public defaultMinStableOutPerInput;

    mapping(address => Policy) private userPolicies;
    mapping(address => UserLedger) public balances;

    event MultiBucketAllocated(
        address indexed recipient,
        address indexed caller,
        uint256 totalProcessed,
        uint256 stableOut,
        uint256 yieldOut,
        uint256 retainedIn,
        uint256 timestamp
    );

    event PolicyUpdated(
        address indexed user,
        uint256 stableBps,
        uint256 yieldBps,
        uint256 retainedBps
    );

    event UserGuardrailsUpdated(
        address indexed user,
        uint256 maxSingleAllocation,
        uint256 minStableOutPerInput
    );

    event DefaultGuardrailsUpdated(
        uint256 maxSingleAllocation,
        uint256 minStableOutPerInput
    );

    event Deposited(address indexed recipient, uint256 amount);
    event Withdrawn(address indexed recipient, address indexed token, uint256 amount);

    modifier onlyOwner() {
        require(msg.sender == owner, "Only owner");
        _;
    }

    constructor(
        address _callbackProxy,
        address _callbackSender,
        address _dexRouter,
        address _inputToken,
        address _stableToken,
        address _yieldToken,
        uint256 _stableBps,
        uint256 _yieldBps
    ) payable AbstractCallback(IPayable(payable(_callbackProxy)), _callbackSender) {
        require(_stableBps + _yieldBps <= 10000, "Invalid bps");
        owner = msg.sender;
        dexRouter = _dexRouter;
        inputToken = _inputToken;
        stableToken = _stableToken;
        yieldToken = _yieldToken;
        defaultStableBps = _stableBps;
        defaultYieldBps = _yieldBps;
    }

    /**
     * @notice Returns effective bucket policy and guardrails for `user`.
     */
    function getPolicy(address user)
        public
        view
        returns (
            uint256 stableBps,
            uint256 yieldBps,
            uint256 maxSingleAllocation,
            uint256 minStableOutPerInput,
            bool configured
        )
    {
        Policy memory p = userPolicies[user];
        if (!p.configured) {
            return (
                defaultStableBps,
                defaultYieldBps,
                defaultMaxSingleAllocation,
                defaultMinStableOutPerInput,
                false
            );
        }
        return (
            p.stableBps,
            p.yieldBps,
            p.maxSingleAllocation,
            p.minStableOutPerInput,
            true
        );
    }

    /**
     * @notice Compatibility view returning default total converted stablecoin bps.
     */
    function allocationBps() external view returns (uint256) {
        return defaultStableBps + defaultYieldBps;
    }

    /**
     * @notice Callback invoked exclusively by the Reactive Omni Callback Proxy on Base Sepolia.
     *         Allocates ONLY `balances[recipient].weth` according to `recipient`'s own policy.
     */
    function executePaycheckAllocation(
        address callbackSender,
        address recipient,
        uint256 inflowAmount
    )
        external
        onlyServiceProvider
        onlyCallbackSender(callbackSender)
    {
        if (recipient == address(0) || inflowAmount == 0) return;

        UserLedger storage acct = balances[recipient];
        if (acct.weth == 0) return;

        (
            uint256 stableBps,
            uint256 yieldBps,
            uint256 cap,
            uint256 slippageFloor,
        ) = getPolicy(recipient);

        uint256 effectiveInflow = inflowAmount;
        if (cap > 0 && effectiveInflow > cap) {
            effectiveInflow = cap;
        }
        if (effectiveInflow > acct.weth) {
            effectiveInflow = acct.weth;
        }
        if (effectiveInflow == 0) return;

        uint256 stableIn = (effectiveInflow * stableBps) / 10000;
        uint256 yieldIn = (effectiveInflow * yieldBps) / 10000;
        uint256 retainedIn = effectiveInflow - stableIn - yieldIn;

        acct.weth -= (stableIn + yieldIn);

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
            if (slippageFloor > 0) {
                uint256 minExpected = (stableIn * slippageFloor) / 1e18;
                require(stableOut >= minExpected, "Slippage exceeded");
            }
            acct.usdc += stableOut;
        }

        if (yieldIn > 0 && yieldToken != address(0)) {
            IERC20(inputToken).forceApprove(dexRouter, yieldIn);
            yieldOut = IMockDEX(dexRouter).swap(
                inputToken,
                yieldToken,
                yieldIn,
                address(this)
            );
            if (slippageFloor > 0) {
                uint256 minExpectedYield = (yieldIn * slippageFloor) / 1e18;
                require(yieldOut >= minExpectedYield, "Slippage exceeded");
            }
            acct.sUsdc += yieldOut;
        }

        emit MultiBucketAllocated(
            recipient,
            callbackSender,
            effectiveInflow,
            stableOut,
            yieldOut,
            retainedIn,
            block.timestamp
        );
    }

    /**
     * @notice Deposit `inputToken` (WETH) into the caller's own vault slice.
     */
    function deposit(uint256 amount) external {
        depositFor(msg.sender, amount);
    }

    /**
     * @notice Deposit `inputToken` (WETH) on behalf of `recipient`.
     */
    function depositFor(address recipient, uint256 amount) public {
        require(recipient != address(0), "Zero recipient");
        require(amount > 0, "Zero deposit");
        IERC20(inputToken).safeTransferFrom(msg.sender, address(this), amount);
        balances[recipient].weth += amount;
        emit Deposited(recipient, amount);
    }

    /**
     * @notice Any connected user can configure their own stablecoin/yield split (total <= 10000 bps).
     */
    function setMyBuckets(uint256 _stableBps, uint256 _yieldBps) external {
        require(_stableBps + _yieldBps <= 10000, "Invalid bps");
        Policy storage p = userPolicies[msg.sender];
        if (!p.configured) {
            p.maxSingleAllocation = defaultMaxSingleAllocation;
            p.minStableOutPerInput = defaultMinStableOutPerInput;
            p.configured = true;
        }
        p.stableBps = _stableBps;
        p.yieldBps = _yieldBps;
        emit PolicyUpdated(msg.sender, _stableBps, _yieldBps, 10000 - _stableBps - _yieldBps);
    }

    /**
     * @notice Any connected user can configure their own callback cap and slippage floor.
     */
    function setMyGuardrails(
        uint256 _maxSingleAllocation,
        uint256 _minStableOutPerInput
    ) external {
        Policy storage p = userPolicies[msg.sender];
        if (!p.configured) {
            p.stableBps = defaultStableBps;
            p.yieldBps = defaultYieldBps;
            p.configured = true;
        }
        p.maxSingleAllocation = _maxSingleAllocation;
        p.minStableOutPerInput = _minStableOutPerInput;
        emit UserGuardrailsUpdated(msg.sender, _maxSingleAllocation, _minStableOutPerInput);
    }

    /**
     * @notice Owner helper to update default guardrails for new unconfigured users.
     */
    function setDefaultGuardrails(
        uint256 _maxSingleAllocation,
        uint256 _minStableOutPerInput
    ) external onlyOwner {
        defaultMaxSingleAllocation = _maxSingleAllocation;
        defaultMinStableOutPerInput = _minStableOutPerInput;
        emit DefaultGuardrailsUpdated(_maxSingleAllocation, _minStableOutPerInput);
    }

    /**
     * @notice Non-custodial withdrawal of the caller's own bucket tokens (`weth`, `usdc`, or `sUsdc`).
     */
    function withdraw(address token, uint256 amount) external {
        require(amount > 0, "Zero withdraw");
        UserLedger storage acct = balances[msg.sender];

        if (token == inputToken) {
            require(acct.weth >= amount, "Insufficient balance");
            acct.weth -= amount;
        } else if (token == stableToken) {
            require(acct.usdc >= amount, "Insufficient balance");
            acct.usdc -= amount;
        } else if (token == yieldToken) {
            require(acct.sUsdc >= amount, "Insufficient balance");
            acct.sUsdc -= amount;
        } else {
            revert("Unsupported token");
        }

        IERC20(token).safeTransfer(msg.sender, amount);
        emit Withdrawn(msg.sender, token, amount);
    }

    /**
     * @notice Settles any outstanding debt to the Base Sepolia Callback Proxy.
     */
    function coverDebt() external {
        _coverDebt();
    }

    /**
     * @notice Returns the authorized Reactive Lasna sender contract address.
     */
    function getCallbackSender() external view returns (address) {
        return _CALLBACK_SENDER;
    }
}

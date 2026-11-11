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
 * @notice Recipient-side autonomous vault deployed on Base Sepolia.
 *         Receives authenticated cross-chain callbacks from Reactive Network (Lasna)
 *         when paycheck/inflows are detected on Sepolia, executing automatic portfolio allocation.
 */
contract PaycheckVault is AbstractCallback {
    using SafeERC20 for IERC20;

    address public owner;
    address public dexRouter;
    address public inputToken;          // e.g. USDC (holding token)
    address public targetToken;         // e.g. WETH (accumulated asset)
    uint256 public allocationBps;       // basis points (e.g., 5000 = 50%, 10000 = 100%)

    event PaycheckAllocated(
        address indexed caller,
        uint256 amountIn,
        uint256 amountOut,
        uint256 timestamp
    );

    event ConfigUpdated(
        address indexed dexRouter,
        address indexed inputToken,
        address indexed targetToken,
        uint256 allocationBps
    );

    modifier onlyOwner() {
        require(msg.sender == owner, "Only owner");
        _;
    }

    constructor(
        address _callbackSender,
        address _dexRouter,
        address _inputToken,
        address _targetToken,
        uint256 _allocationBps
    ) AbstractCallback(_callbackSender) payable {
        owner = msg.sender;
        dexRouter = _dexRouter;
        inputToken = _inputToken;
        targetToken = _targetToken;
        allocationBps = _allocationBps;
    }

    /**
     * @notice Callback invoked exclusively by the Reactive Network relayer.
     *         Authentication is enforced by:
     *         1. authorizedSenderOnly (must be the Base Sepolia Callback Proxy)
     *         2. rvmIdOnly(sender) (must match the authorized deployer wallet RVM ID)
     * @param sender The address of the authorized reactive deployer wallet (RVM ID).
     * @param inflowAmount The amount of token transferred into the user's Sepolia account.
     */
    function executePaycheckAllocation(address sender, uint256 inflowAmount)
        external
        authorizedSenderOnly
        rvmIdOnly(sender)
    {
        uint256 balance = IERC20(inputToken).balanceOf(address(this));
        if (balance == 0 || inflowAmount == 0) return;

        // Calculate amount to swap based on inflow and configured percentage
        uint256 swapAmount = (inflowAmount * allocationBps) / 10000;
        if (swapAmount > balance) {
            swapAmount = balance;
        }

        if (swapAmount > 0) {
            IERC20(inputToken).forceApprove(dexRouter, swapAmount);
            uint256 amountOut = IMockDEX(dexRouter).swap(
                inputToken,
                targetToken,
                swapAmount,
                address(this)
            );

            emit PaycheckAllocated(sender, swapAmount, amountOut, block.timestamp);
        }
    }

    /**
     * @notice Allows user or employer to deposit funds directly on Base Sepolia.
     */
    function deposit(uint256 amount) external {
        require(amount > 0, "Zero deposit");
        IERC20(inputToken).safeTransferFrom(msg.sender, address(this), amount);
    }

    function setConfig(
        address _dexRouter,
        address _inputToken,
        address _targetToken,
        uint256 _allocationBps
    ) external onlyOwner {
        dexRouter = _dexRouter;
        inputToken = _inputToken;
        targetToken = _targetToken;
        allocationBps = _allocationBps;
        emit ConfigUpdated(_dexRouter, _inputToken, _targetToken, _allocationBps);
    }

    function withdraw(address token, uint256 amount) external onlyOwner {
        IERC20(token).safeTransfer(owner, amount);
    }

    function getRvmId() external view returns (address) {
        return rvm_id;
    }
}

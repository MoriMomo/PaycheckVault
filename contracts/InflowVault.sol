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
 * @title InflowVault
 * @notice Holds user funds, allows direct ERC-20 transfers or deposit calls,
 *         and executes swaps upon verified Reactive callbacks from Lasna.
 */
contract InflowVault is AbstractCallback {
    using SafeERC20 for IERC20;

    address public owner;
    address public dexRouter;
    address public inputToken;       // e.g. USDC (inflow token)
    address public outputToken;      // e.g. WETH (accumulated asset)
    uint256 public dcaPercentageBps; // basis points (e.g., 5000 = 50%, 10000 = 100%)

    event InflowReceived(
        address indexed sender,
        address indexed token,
        uint256 amount,
        uint256 timestamp
    );

    event DCASwapped(
        address indexed caller,
        uint256 amountIn,
        uint256 amountOut,
        uint256 timestamp
    );

    modifier onlyOwner() {
        require(msg.sender == owner, "Only owner");
        _;
    }

    constructor(
        address _callbackSender,
        address _dexRouter,
        address _inputToken,
        address _outputToken,
        uint256 _dcaPercentageBps
    ) AbstractCallback(_callbackSender) payable {
        owner = msg.sender;
        dexRouter = _dexRouter;
        inputToken = _inputToken;
        outputToken = _outputToken;
        dcaPercentageBps = _dcaPercentageBps;
    }

    /**
     * @notice Deposit helper for UI and tests. Standard ERC-20 transfers directly to this address
     *         are also caught by the Reactive contract via ERC-20 Transfer event subscription.
     */
    function deposit(uint256 amount) external {
        require(amount > 0, "Zero deposit");
        IERC20(inputToken).safeTransferFrom(msg.sender, address(this), amount);
        emit InflowReceived(msg.sender, inputToken, amount, block.timestamp);
    }

    /**
     * @notice Callback invoked by Reactive Network relayer upon catching an inflow event.
     * @param sender The address of the authorized reactive deployer wallet (RVM ID).
     * @param inflowAmount The amount of token received in the detected inflow.
     */
    function executeInflowDCA(address sender, uint256 inflowAmount)
        external
        authorizedSenderOnly
        rvmIdOnly(sender)
    {
        uint256 balance = IERC20(inputToken).balanceOf(address(this));
        if (balance == 0 || inflowAmount == 0) return;

        // Calculate amount to swap based on inflow and configured percentage
        uint256 swapAmount = (inflowAmount * dcaPercentageBps) / 10000;
        if (swapAmount > balance) {
            swapAmount = balance;
        }

        if (swapAmount > 0) {
            IERC20(inputToken).forceApprove(dexRouter, swapAmount);
            uint256 amountOut = IMockDEX(dexRouter).swap(
                inputToken,
                outputToken,
                swapAmount,
                address(this)
            );

            emit DCASwapped(sender, swapAmount, amountOut, block.timestamp);
        }
    }

    function setConfig(
        address _dexRouter,
        address _inputToken,
        address _outputToken,
        uint256 _dcaPercentageBps
    ) external onlyOwner {
        dexRouter = _dexRouter;
        inputToken = _inputToken;
        outputToken = _outputToken;
        dcaPercentageBps = _dcaPercentageBps;
    }

    function withdraw(address token, uint256 amount) external onlyOwner {
        IERC20(token).safeTransfer(owner, amount);
    }

    function getRvmId() external view returns (address) {
        return rvm_id;
    }
}

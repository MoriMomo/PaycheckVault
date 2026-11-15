// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "../reactive-lib-omni/interfaces/ISystemContract.sol";
import "../reactive-lib-omni/interfaces/IPayer.sol";

/**
 * @title MockSystemContract
 * @notice Hardhat test mock mimicking Reactive Network Omni SYSTEM contract at 0x8888...8888.
 */
contract MockSystemContract is ISystemContract {
    mapping(address => uint256) public debts;
    uint256 public subscriptionCount;

    event Subscribed(
        address indexed subscriber,
        uint256 indexed chainId,
        address indexed contractAddress,
        uint256 topic0,
        uint256 topic1,
        uint256 topic2,
        uint256 topic3
    );

    event CallbackRequest(
        uint256 indexed chainId,
        address indexed sender,
        address indexed recipient,
        CallbackVersion version,
        bytes configuration
    );

    receive() external payable {}

    function debt(address contract_) external view returns (uint256) {
        return debts[contract_];
    }

    function subscribe(
        uint256 chainId_,
        address contract_,
        uint256 topic0_,
        uint256 topic1_,
        uint256 topic2_,
        uint256 topic3_
    ) external {
        subscriptionCount += 1;
        emit Subscribed(msg.sender, chainId_, contract_, topic0_, topic1_, topic2_, topic3_);
    }

    function unsubscribe(
        uint256,
        address,
        uint256,
        uint256,
        uint256,
        uint256
    ) external {}

    function requestCallback(CallbackVersion version_, bytes memory config_) external {
        (uint256 chainId, address recipient,,) = abi.decode(config_, (uint256, address, uint64, bytes));
        emit CallbackRequest(chainId, msg.sender, recipient, version_, config_);
    }

    function requestCallbackV_1_0(CallbackConfiguration_V_1_0 memory config_) external {
        emit CallbackRequest(
            config_.chainId,
            msg.sender,
            config_.recipient,
            CallbackVersion.V_1_0,
            abi.encode(config_)
        );
    }

    function triggerPay(address payer, uint256 amount) external {
        IPayer(payable(payer)).pay(amount);
    }
}

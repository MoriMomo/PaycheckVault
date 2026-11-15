// SPDX-License-Identifier: UNLICENSED

pragma solidity >=0.8.24;

import { IPayer } from "./IPayer.sol";

/**
 * @title Interface for reactive contracts (Reactive Omni).
 */
interface IReactive is IPayer {
    struct LogRecord {
        uint256 chainId;
        address contractAddress;
        uint256 topic0;
        uint256 topic1;
        uint256 topic2;
        uint256 topic3;
        bytes data;
        uint256 blockNumber;
        uint256 opCode;
        uint256 blockHash;
        uint256 txHash;
        uint256 logIndex;
    }

    event Callback(
        uint256 indexed chainId_,
        address indexed contract_,
        uint64 indexed gasLimit_,
        bytes payload_
    );

    function react(LogRecord calldata log_) external;
}

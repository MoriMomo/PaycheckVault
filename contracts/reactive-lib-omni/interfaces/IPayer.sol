// SPDX-License-Identifier: UNLICENSED

pragma solidity >=0.8.24;

/**
 * @title Common interface for the contracts that need to pay for system contract's or proxies' services.
 */
interface IPayer {
    function pay(uint256 amount_) external;
    receive() external payable;
}

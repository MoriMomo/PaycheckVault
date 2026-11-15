// SPDX-License-Identifier: UNLICENSED

pragma solidity >=0.8.24;

/**
 * @title Common interface for the system contract and the callback proxy, allows contracts to check and pay their debts.
 */
interface IPayable {
    receive() external payable;
    function debt(address contract_) external view returns (uint256 debt_);
}

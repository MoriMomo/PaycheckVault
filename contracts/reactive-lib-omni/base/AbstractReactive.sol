// SPDX-License-Identifier: UNLICENSED

pragma solidity >=0.8.24;

import { ISystemContract } from "../interfaces/ISystemContract.sol";
import { IReactive } from "../interfaces/IReactive.sol";
import { AbstractPayer } from "./AbstractPayer.sol";

/**
 * @title Abstract base contract for reactive contracts (Reactive Omni).
 */
abstract contract AbstractReactive is AbstractPayer, IReactive {
    ISystemContract internal constant SYSTEM = ISystemContract(payable(0x8888888888888888888888888888888888888888));
    uint256 internal constant REACTIVE_IGNORE = 0xa65f96fc951c35ead38878e0f0b7a3c744a6f5ccc1476b313353ce31712313ad;

    constructor() AbstractPayer(SYSTEM) {}

    modifier onlySystem() {
        _onlyServiceProvider();
        _;
    }
}

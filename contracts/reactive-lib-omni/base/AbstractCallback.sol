// SPDX-License-Identifier: UNLICENSED

pragma solidity >=0.8.24;

import { IPayable } from "../interfaces/IPayable.sol";
import { AbstractPayer } from "./AbstractPayer.sol";

/**
 * @title Abstract base contract for contracts receiving the Reactive Network Omni callbacks.
 */
abstract contract AbstractCallback is AbstractPayer {
    error CallbackNotAuthorized(address sender_, address expectedSender_);

    address public immutable _CALLBACK_SENDER;

    constructor(IPayable callbackProxy_, address callbackSender_) AbstractPayer(callbackProxy_) {
        _CALLBACK_SENDER = callbackSender_;
    }

    modifier onlyCallbackSender(address callbackSender_) {
        _onlyCallbackSender(callbackSender_);
        _;
    }

    function _onlyCallbackSender(address callbackSender_) internal view {
        if (callbackSender_ != _CALLBACK_SENDER) {
            revert CallbackNotAuthorized(callbackSender_, _CALLBACK_SENDER);
        }
    }
}

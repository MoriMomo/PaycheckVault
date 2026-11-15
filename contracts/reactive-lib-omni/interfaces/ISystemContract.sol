// SPDX-License-Identifier: UNLICENSED

pragma solidity >=0.8.24;

import { IPayable } from "./IPayable.sol";
import { ISubscriptionService } from "./ISubscriptionService.sol";

/**
 * @title Interface for the Reactive Network's system contract (Omni).
 */
interface ISystemContract is IPayable, ISubscriptionService {
    enum CallbackVersion { V_1_0 }

    struct CallbackConfiguration_V_1_0 {
        uint256 chainId;
        address recipient;
        uint64 gasLimit;
        bytes payload;
    }

    function requestCallback(CallbackVersion version_, bytes memory config_) external;
    function requestCallbackV_1_0(CallbackConfiguration_V_1_0 memory config_) external;
}

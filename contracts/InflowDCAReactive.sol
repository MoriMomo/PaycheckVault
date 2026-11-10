// SPDX-License-Identifier: MIT
pragma solidity >=0.8.0;

import "./reactive-lib/interfaces/IReactive.sol";
import "./reactive-lib/abstract-base/AbstractReactive.sol";
import "./reactive-lib/interfaces/ISystemContract.sol";

/**
 * @title InflowDCAReactive
 * @notice Deployed on Lasna testnet. Subscribes to InflowReceived events on origin vault
 *         and fires an authenticated callback to executeInflowDCA on destination vault.
 */
contract InflowDCAReactive is IReactive, AbstractReactive {
    uint256 public originChainId;
    uint256 public destinationChainId;
    address public originVault;
    address public destinationVault;
    uint64 private constant GAS_LIMIT = 1000000;

    // keccak256("InflowReceived(address,address,uint256,uint256)")
    uint256 public constant INFLOW_TOPIC_0 = 
        uint256(keccak256("InflowReceived(address,address,uint256,uint256)"));

    event DCAProcessed(uint256 indexed amount, address indexed vault);

    constructor(
        uint256 _originChainId,
        uint256 _destinationChainId,
        address _originVault,
        address _destinationVault
    ) payable {
        originChainId = _originChainId;
        destinationChainId = _destinationChainId;
        originVault = _originVault;
        destinationVault = _destinationVault;

        if (!vm) {
            // Subscribe to InflowReceived events specifically from originVault
            service.subscribe(
                originChainId,
                originVault,
                INFLOW_TOPIC_0,
                REACTIVE_IGNORE,
                REACTIVE_IGNORE,
                REACTIVE_IGNORE
            );
        }
    }

    /**
     * @notice Invoked by ReactVM when an event matching subscription is detected.
     */
    function react(LogRecord calldata log) external vmOnly {
        // Verify source contract and topic
        if (log._contract != originVault || log.topic_0 != INFLOW_TOPIC_0) {
            return;
        }

        // InflowReceived has non-indexed parameters: (uint256 amount, uint256 timestamp) in log.data
        (uint256 amount, ) = abi.decode(log.data, (uint256, uint256));

        if (amount > 0) {
            // Encode callback to destination vault: executeInflowDCA(address sender, uint256 inflowAmount)
            bytes memory payload = abi.encodeWithSignature(
                "executeInflowDCA(address,uint256)",
                address(0), // sender placeholder populated by Reactive relayer with RVM ID
                amount
            );

            emit Callback(destinationChainId, destinationVault, GAS_LIMIT, payload);
            emit DCAProcessed(amount, destinationVault);
        }
    }
}

// SPDX-License-Identifier: MIT
pragma solidity >=0.8.0;

import "./reactive-lib/interfaces/IReactive.sol";
import "./reactive-lib/abstract-base/AbstractReactive.sol";
import "./reactive-lib/interfaces/ISystemContract.sol";

/**
 * @title InflowDCAReactive
 * @notice Deployed on Lasna testnet. Subscribes to ERC-20 Transfer events where recipient == vault
 *         and fires an authenticated callback to executeInflowDCA on destination vault.
 */
contract InflowDCAReactive is IReactive, AbstractReactive {
    uint256 public originChainId;
    uint256 public destinationChainId;
    address public originToken;       // Inflow ERC-20 token (e.g. USDC)
    address public originVault;       // Monitored Vault receiving the transfer
    address public destinationVault;  // Target Vault executing the callback swap
    uint256 public minInflowThreshold;// Anti-spam threshold to protect Lasna gas balance
    uint64 private constant GAS_LIMIT = 1000000;

    // keccak256("Transfer(address,address,uint256)")
    uint256 public constant ERC20_TRANSFER_TOPIC_0 = 
        uint256(keccak256("Transfer(address,address,uint256)"));

    event DCAProcessed(uint256 indexed amount, address indexed vault);

    constructor(
        uint256 _originChainId,
        uint256 _destinationChainId,
        address _originToken,
        address _originVault,
        address _destinationVault,
        uint256 _minInflowThreshold
    ) payable {
        originChainId = _originChainId;
        destinationChainId = _destinationChainId;
        originToken = _originToken;
        originVault = _originVault;
        destinationVault = _destinationVault;
        minInflowThreshold = _minInflowThreshold;

        if (!vm) {
            // Subscribe to Transfer(from, to, amount) events emitted by originToken
            // topic_0: Transfer signature
            // topic_1: from (REACTIVE_IGNORE matches any sender)
            // topic_2: to (filtered specifically to originVault)
            // topic_3: REACTIVE_IGNORE
            service.subscribe(
                originChainId,
                originToken,
                ERC20_TRANSFER_TOPIC_0,
                REACTIVE_IGNORE,
                uint256(uint160(originVault)), // indexed 'to' address as topic_2
                REACTIVE_IGNORE
            );
        }
    }

    /**
     * @notice Invoked by ReactVM when an event matching subscription is detected.
     */
    function react(LogRecord calldata log) external vmOnly {
        // Double check token contract, topic_0, and destination topic_2
        if (
            log._contract != originToken ||
            log.topic_0 != ERC20_TRANSFER_TOPIC_0 ||
            log.topic_2 != uint256(uint160(originVault))
        ) {
            return;
        }

        // In standard ERC20 Transfer(from, to, amount):
        // amount is non-indexed and passed in log.data (32 bytes)
        uint256 amount = abi.decode(log.data, (uint256));

        // Anti-spam guard: ignore dust transfers below threshold
        if (amount >= minInflowThreshold) {
            // Encode callback to destination vault: executeInflowDCA(address sender, uint256 inflowAmount)
            // Note: address(0) placeholder is replaced with this reactive contract's RVM address by Reactive relayer
            bytes memory payload = abi.encodeWithSignature(
                "executeInflowDCA(address,uint256)",
                address(0),
                amount
            );

            emit Callback(destinationChainId, destinationVault, GAS_LIMIT, payload);
            emit DCAProcessed(amount, destinationVault);
        }
    }
}

// SPDX-License-Identifier: MIT
pragma solidity >=0.8.0;

import "./reactive-lib/interfaces/IReactive.sol";
import "./reactive-lib/abstract-base/AbstractReactive.sol";
import "./reactive-lib/interfaces/ISystemContract.sol";

/**
 * @title PaycheckReactive
 * @notice Deployed on Lasna testnet (Chain ID 2611).
 *         Subscribes to ERC-20 Transfer events on Sepolia (Chain ID 11155111) targeting user's wallet
 *         and fires an authenticated cross-chain callback to PaycheckVault on Base Sepolia (Chain ID 84532).
 */
contract PaycheckReactive is IReactive, AbstractReactive {
    uint256 public constant SEPOLIA_CHAIN_ID = 11155111;
    uint256 public constant BASE_SEPOLIA_CHAIN_ID = 84532;

    address public originToken;             // e.g. Sepolia USDC
    address public monitoredRecipient;       // User's salary / inflow receiving address on Sepolia
    address public destinationVault;        // PaycheckVault on Base Sepolia
    uint256 public minInflowThreshold;      // Anti-dust threshold
    uint64 private constant GAS_LIMIT = 1000000;

    // keccak256("Transfer(address,address,uint256)")
    uint256 public constant ERC20_TRANSFER_TOPIC_0 = 
        uint256(keccak256("Transfer(address,address,uint256)"));

    event PaycheckTriggered(
        uint256 indexed amount,
        address indexed destinationVault,
        uint256 timestamp
    );

    constructor(
        address _originToken,
        address _monitoredRecipient,
        address _destinationVault,
        uint256 _minInflowThreshold
    ) payable {
        originToken = _originToken;
        monitoredRecipient = _monitoredRecipient;
        destinationVault = _destinationVault;
        minInflowThreshold = _minInflowThreshold;

        if (!vm) {
            // Subscribe to ERC-20 Transfer(from, to, amount) events on Sepolia
            // topic_0: Transfer signature
            // topic_1: from (REACTIVE_IGNORE matches any sender e.g. employer, client, exchange)
            // topic_2: to (monitored recipient wallet on Sepolia)
            // topic_3: REACTIVE_IGNORE
            service.subscribe(
                SEPOLIA_CHAIN_ID,
                originToken,
                ERC20_TRANSFER_TOPIC_0,
                REACTIVE_IGNORE,
                uint256(uint160(monitoredRecipient)),
                REACTIVE_IGNORE
            );
        }
    }

    /**
     * @notice Invoked by ReactVM when an event matching subscription is detected on Sepolia.
     */
    function react(LogRecord calldata log) external vmOnly {
        // Verify source chain, contract, topic_0, and monitored recipient
        if (
            log.chain_id != SEPOLIA_CHAIN_ID ||
            log._contract != originToken ||
            log.topic_0 != ERC20_TRANSFER_TOPIC_0 ||
            log.topic_2 != uint256(uint160(monitoredRecipient))
        ) {
            return;
        }

        // Decode non-indexed transfer amount from log.data
        uint256 amount = abi.decode(log.data, (uint256));

        // Anti-spam guard: ignore dust transfers below threshold
        if (amount >= minInflowThreshold) {
            // Callback to PaycheckVault on Base Sepolia: executePaycheckAllocation(address sender, uint256 inflowAmount)
            // address(0) is replaced with the deployer RVM ID by the Reactive relayer
            bytes memory payload = abi.encodeWithSignature(
                "executePaycheckAllocation(address,uint256)",
                address(0),
                amount
            );

            emit Callback(BASE_SEPOLIA_CHAIN_ID, destinationVault, GAS_LIMIT, payload);
            emit PaycheckTriggered(amount, destinationVault, block.timestamp);
        }
    }
}

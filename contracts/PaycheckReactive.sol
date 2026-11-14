// SPDX-License-Identifier: MIT
pragma solidity >=0.8.0;

import "./reactive-lib/interfaces/IReactive.sol";
import "./reactive-lib/abstract-base/AbstractReactive.sol";
import "./reactive-lib/interfaces/ISystemContract.sol";

/**
 * @title PaycheckReactive
 * @notice Deployed on Lasna testnet (Chain ID 5318007).
 *         Subscribes to ERC-20 Transfer events on Sepolia (Chain ID 11155111) targeting user's wallet,
 *         enforces anti-dust threshold and callback cooldown guardrails, and fires an authenticated
 *         cross-chain callback to PaycheckVault on Base Sepolia (Chain ID 84532).
 */
contract PaycheckReactive is IReactive, AbstractReactive {
    uint256 public constant SEPOLIA_CHAIN_ID = 11155111;
    uint256 public constant BASE_SEPOLIA_CHAIN_ID = 84532;

    address public originToken;             // e.g. Sepolia WETH (volatile inflow asset)
    address public monitoredRecipient;      // User's inflow receiving wallet on Sepolia
    address public destinationVault;        // PaycheckVault on Base Sepolia
    uint256 public minInflowThreshold;      // Anti-dust guardrail threshold
    uint256 public cooldownPeriod;          // Minimum seconds between callbacks (0 = disabled)
    uint256 public lastTriggeredAt;         // Timestamp of most recent callback dispatch
    uint256 public totalCallbacksEmitted;
    uint256 public totalDustBlocked;
    uint256 public totalCooldownBlocked;

    uint64 private constant GAS_LIMIT = 1000000;

    // keccak256("Transfer(address,address,uint256)")
    uint256 public constant ERC20_TRANSFER_TOPIC_0 =
        uint256(keccak256("Transfer(address,address,uint256)"));

    event PaycheckTriggered(
        uint256 indexed amount,
        address indexed destinationVault,
        uint256 timestamp
    );

    event InflowSuppressed(
        uint256 indexed amount,
        string reason,
        uint256 timestamp
    );

    constructor(
        address _originToken,
        address _monitoredRecipient,
        address _destinationVault,
        uint256 _minInflowThreshold,
        uint256 _cooldownPeriod
    ) payable {
        originToken = _originToken;
        monitoredRecipient = _monitoredRecipient;
        destinationVault = _destinationVault;
        minInflowThreshold = _minInflowThreshold;
        cooldownPeriod = _cooldownPeriod;

        if (!vm) {
            // Subscribe to ERC-20 Transfer(from, to, amount) events on Sepolia
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
        if (
            log.chain_id != SEPOLIA_CHAIN_ID ||
            log._contract != originToken ||
            log.topic_0 != ERC20_TRANSFER_TOPIC_0 ||
            log.topic_2 != uint256(uint160(monitoredRecipient))
        ) {
            return;
        }

        uint256 amount = abi.decode(log.data, (uint256));

        // Guardrail 1: Anti-dust spam filter
        if (amount < minInflowThreshold) {
            totalDustBlocked += 1;
            emit InflowSuppressed(amount, "DUST_THRESHOLD", block.timestamp);
            return;
        }

        // Guardrail 2: Cooldown rate limiter
        if (
            cooldownPeriod > 0 &&
            lastTriggeredAt != 0 &&
            block.timestamp < lastTriggeredAt + cooldownPeriod
        ) {
            totalCooldownBlocked += 1;
            emit InflowSuppressed(amount, "COOLDOWN", block.timestamp);
            return;
        }

        lastTriggeredAt = block.timestamp;
        totalCallbacksEmitted += 1;

        bytes memory payload = abi.encodeWithSignature(
            "executePaycheckAllocation(address,uint256)",
            address(0),
            amount
        );

        emit Callback(BASE_SEPOLIA_CHAIN_ID, destinationVault, GAS_LIMIT, payload);
        emit PaycheckTriggered(amount, destinationVault, block.timestamp);
    }
}

// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import { IReactive } from "./reactive-lib-omni/interfaces/IReactive.sol";
import { ISystemContract } from "./reactive-lib-omni/interfaces/ISystemContract.sol";
import { AbstractReactive } from "./reactive-lib-omni/base/AbstractReactive.sol";

/**
 * @title PaycheckReactive
 * @notice Deployed on Reactive Network Lasna (Chain ID 5318007, Omni architecture).
 *         Subscribes to ERC-20 Transfer events on Sepolia (Chain ID 11155111) across all recipients
 *         (or a single recipient when non-zero), enforces per-user anti-dust and cooldown guardrails,
 *         and requests an authenticated cross-chain callback to PaycheckVault on Base Sepolia (84532).
 */
contract PaycheckReactive is AbstractReactive {
    uint256 public constant SEPOLIA_CHAIN_ID = 11155111;
    uint256 public constant BASE_SEPOLIA_CHAIN_ID = 84532;

    address public owner;
    address public originToken;             // Sepolia inflow asset (e.g. WETH)
    address public monitoredRecipient;      // Optional single recipient filter; address(0) = wildcard multi-user
    address public destinationVault;        // PaycheckVault on Base Sepolia
    uint256 public minInflowThreshold;      // Anti-dust guardrail threshold
    uint256 public cooldownPeriod;          // Minimum seconds between callbacks per recipient (0 = disabled)

    mapping(address => uint256) public lastTriggeredAt;
    uint256 public totalCallbacksEmitted;
    uint256 public totalDustBlocked;
    uint256 public totalCooldownBlocked;

    uint64 private constant GAS_LIMIT = 1000000;

    // keccak256("Transfer(address,address,uint256)")
    uint256 public constant ERC20_TRANSFER_TOPIC_0 =
        uint256(keccak256("Transfer(address,address,uint256)"));

    event PaycheckTriggered(
        address indexed recipient,
        uint256 indexed amount,
        address indexed destinationVault,
        uint256 timestamp
    );

    event InflowSuppressed(
        address indexed recipient,
        uint256 indexed amount,
        string reason,
        uint256 timestamp
    );

    event DestinationVaultUpdated(address indexed previousVault, address indexed newVault);
    event GuardrailsUpdated(uint256 minInflowThreshold, uint256 cooldownPeriod);

    modifier onlyOwner() {
        require(msg.sender == owner, "Only owner");
        _;
    }

    constructor(
        address _originToken,
        address _monitoredRecipient,
        address _destinationVault,
        uint256 _minInflowThreshold,
        uint256 _cooldownPeriod
    ) payable {
        owner = msg.sender;
        originToken = _originToken;
        monitoredRecipient = _monitoredRecipient;
        destinationVault = _destinationVault;
        minInflowThreshold = _minInflowThreshold;
        cooldownPeriod = _cooldownPeriod;

        uint256 topic2Filter = _monitoredRecipient == address(0)
            ? REACTIVE_IGNORE
            : uint256(uint160(_monitoredRecipient));

        SYSTEM.subscribe(
            SEPOLIA_CHAIN_ID,
            originToken,
            ERC20_TRANSFER_TOPIC_0,
            REACTIVE_IGNORE,
            topic2Filter,
            REACTIVE_IGNORE
        );
    }

    /**
     * @notice Set destination vault on Base Sepolia after deploying PaycheckVault with this contract as _CALLBACK_SENDER.
     */
    function setDestinationVault(address _destinationVault) external onlyOwner {
        require(_destinationVault != address(0), "Zero vault");
        emit DestinationVaultUpdated(destinationVault, _destinationVault);
        destinationVault = _destinationVault;
    }

    /**
     * @notice Update anti-dust floor and cooldown rate-limiter parameters.
     */
    function setGuardrails(uint256 _minInflowThreshold, uint256 _cooldownPeriod) external onlyOwner {
        minInflowThreshold = _minInflowThreshold;
        cooldownPeriod = _cooldownPeriod;
        emit GuardrailsUpdated(_minInflowThreshold, _cooldownPeriod);
    }

    /**
     * @notice Settles any outstanding debt to the Reactive SYSTEM contract.
     */
    function coverDebt() external {
        _coverDebt();
    }

    /**
     * @inheritdoc IReactive
     * @notice Invoked by Reactive Omni SYSTEM (0x8888...8888) when a matching Sepolia Transfer occurs.
     */
    function react(LogRecord calldata log_) external onlySystem {
        if (
            log_.chainId != SEPOLIA_CHAIN_ID ||
            log_.contractAddress != originToken ||
            log_.topic0 != ERC20_TRANSFER_TOPIC_0 ||
            destinationVault == address(0)
        ) {
            return;
        }

        address recipient = address(uint160(log_.topic2));
        if (recipient == address(0)) {
            return;
        }
        if (monitoredRecipient != address(0) && recipient != monitoredRecipient) {
            return;
        }

        uint256 amount = abi.decode(log_.data, (uint256));

        // Guardrail 1: Anti-dust spam filter
        if (amount < minInflowThreshold) {
            totalDustBlocked += 1;
            emit InflowSuppressed(recipient, amount, "DUST_THRESHOLD", block.timestamp);
            return;
        }

        // Guardrail 2: Per-recipient cooldown rate limiter
        uint256 prevTriggered = lastTriggeredAt[recipient];
        if (
            cooldownPeriod > 0 &&
            prevTriggered != 0 &&
            block.timestamp < prevTriggered + cooldownPeriod
        ) {
            totalCooldownBlocked += 1;
            emit InflowSuppressed(recipient, amount, "COOLDOWN", block.timestamp);
            return;
        }

        lastTriggeredAt[recipient] = block.timestamp;
        totalCallbacksEmitted += 1;

        bytes memory payload = abi.encodeWithSignature(
            "executePaycheckAllocation(address,address,uint256)",
            address(0),
            recipient,
            amount
        );

        SYSTEM.requestCallbackV_1_0(
            ISystemContract.CallbackConfiguration_V_1_0({
                chainId: BASE_SEPOLIA_CHAIN_ID,
                recipient: destinationVault,
                gasLimit: GAS_LIMIT,
                payload: payload
            })
        );

        emit PaycheckTriggered(recipient, amount, destinationVault, block.timestamp);
    }
}

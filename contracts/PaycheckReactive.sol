// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import { IReactive } from "./reactive-lib-omni/interfaces/IReactive.sol";
import { ISystemContract } from "./reactive-lib-omni/interfaces/ISystemContract.sol";
import { AbstractReactive } from "./reactive-lib-omni/base/AbstractReactive.sol";

/**
 * @title PaycheckReactive
 * @notice Deployed on Reactive Network Lasna (Chain ID 5318007, Omni architecture).
 *         Subscribes to ERC-20 Transfer events on Sepolia (Chain ID 11155111) targeting user's wallet,
 *         enforces anti-dust threshold and callback cooldown guardrails, and requests an authenticated
 *         cross-chain callback to PaycheckVault on Base Sepolia (Chain ID 84532) via SYSTEM.
 */
contract PaycheckReactive is AbstractReactive {
    uint256 public constant SEPOLIA_CHAIN_ID = 11155111;
    uint256 public constant BASE_SEPOLIA_CHAIN_ID = 84532;

    address public owner;
    address public originToken;             // Sepolia volatile inflow asset (e.g. WETH)
    address public monitoredRecipient;      // User's inflow receiving wallet on Sepolia
    address public destinationVault;        // PaycheckVault on Base Sepolia
    uint256 public minInflowThreshold;      // Anti-dust guardrail threshold
    uint256 public cooldownPeriod;          // Minimum seconds between callbacks (0 = disabled)
    uint256 public lastTriggeredAt;         // Timestamp of most recent callback request
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

        SYSTEM.subscribe(
            SEPOLIA_CHAIN_ID,
            originToken,
            ERC20_TRANSFER_TOPIC_0,
            REACTIVE_IGNORE,
            uint256(uint160(monitoredRecipient)),
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
            log_.topic2 != uint256(uint160(monitoredRecipient)) ||
            destinationVault == address(0)
        ) {
            return;
        }

        uint256 amount = abi.decode(log_.data, (uint256));

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

        SYSTEM.requestCallbackV_1_0(
            ISystemContract.CallbackConfiguration_V_1_0({
                chainId: BASE_SEPOLIA_CHAIN_ID,
                recipient: destinationVault,
                gasLimit: GAS_LIMIT,
                payload: payload
            })
        );

        emit PaycheckTriggered(amount, destinationVault, block.timestamp);
    }
}

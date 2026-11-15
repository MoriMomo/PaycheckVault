import { expect } from "chai";
import hardhat from "hardhat";
import { time, setBalance, setCode, impersonateAccount } from "@nomicfoundation/hardhat-toolbox/network-helpers.js";
const { ethers } = hardhat;

describe("PaycheckVault Multi-Bucket Stablecoin & Omni Guardrail Suite", function () {
  let owner, employer, relayer, user, systemSigner;
  let mockWETH_Sepolia, mockWETH_Base, mockUSDC_Base, mockSUSDC_Base, mockDEX_Base;
  let paycheckVault_Base, paycheckReactive_Lasna, systemContract;

  const SYSTEM_ADDRESS = "0x8888888888888888888888888888888888888888";
  const SEPOLIA_CHAIN_ID = 11155111n;
  const BASE_SEPOLIA_CHAIN_ID = 84532n;
  const STABLE_BPS = 5000; // 50% Core USDC Reserve
  const YIELD_BPS = 3000;  // 30% Yield Stable (sUSDC)
  // Remaining 20% stays liquid in WETH
  const MIN_INFLOW_THRESHOLD = ethers.parseUnits("0.01", 18); // 0.01 WETH (~$25 anti-dust)
  const COOLDOWN_SECONDS = 30n;
  const ETH_USDC_RATE = ethers.parseEther("2500"); // 1 WETH = 2,500 USDC / sUSDC

  function buildTransferLog(tokenAddr, from, to, amount, blockNum = 100n) {
    return {
      chainId: SEPOLIA_CHAIN_ID,
      contractAddress: tokenAddr,
      topic0: BigInt(ethers.id("Transfer(address,address,uint256)")),
      topic1: BigInt(from),
      topic2: BigInt(to),
      topic3: 0n,
      data: ethers.AbiCoder.defaultAbiCoder().encode(["uint256"], [amount]),
      blockNumber: blockNum,
      opCode: 3n,
      blockHash: 1n,
      txHash: blockNum,
      logIndex: 0n,
    };
  }

  beforeEach(async function () {
    [owner, employer, relayer, user] = await ethers.getSigners();

    // Install MockSystemContract at Reactive Omni SYSTEM address (0x8888...8888)
    const MockSystem = await ethers.getContractFactory("MockSystemContract");
    const deployedMockSys = await MockSystem.deploy();
    const runtimeCode = await ethers.provider.getCode(await deployedMockSys.getAddress());
    await setCode(SYSTEM_ADDRESS, runtimeCode);
    await setBalance(SYSTEM_ADDRESS, ethers.parseEther("10"));
    await impersonateAccount(SYSTEM_ADDRESS);
    systemSigner = await ethers.getSigner(SYSTEM_ADDRESS);
    systemContract = await ethers.getContractAt("MockSystemContract", SYSTEM_ADDRESS);

    const MockERC20 = await ethers.getContractFactory("MockERC20");

    // 1. Sepolia Volatile Origin Inflow Token (WETH)
    mockWETH_Sepolia = await MockERC20.deploy("Sepolia Wrapped Ether", "WETH");

    // 2. Base Sepolia Treasury Assets
    mockWETH_Base = await MockERC20.deploy("Base Wrapped Ether", "WETH");
    mockUSDC_Base = await MockERC20.deploy("Base USD Coin", "USDC");
    mockSUSDC_Base = await MockERC20.deploy("Base Savings USD Coin", "sUSDC");

    // 3. Base Sepolia MockDEX (1 WETH = 2,500 USDC / 2,500 sUSDC)
    const MockDEX = await ethers.getContractFactory("MockDEX");
    mockDEX_Base = await MockDEX.deploy(ETH_USDC_RATE);
    await mockDEX_Base.setPairRate(
      await mockWETH_Base.getAddress(),
      await mockUSDC_Base.getAddress(),
      ETH_USDC_RATE
    );
    await mockDEX_Base.setPairRate(
      await mockWETH_Base.getAddress(),
      await mockSUSDC_Base.getAddress(),
      ETH_USDC_RATE
    );

    // Fund DEX with stablecoin liquidity
    await mockUSDC_Base.mint(await mockDEX_Base.getAddress(), ethers.parseUnits("5000000", 18));
    await mockSUSDC_Base.mint(await mockDEX_Base.getAddress(), ethers.parseUnits("5000000", 18));

    // 4. Deploy PaycheckReactive on Lasna Omni first (destination set after vault deploys)
    const PaycheckReactive = await ethers.getContractFactory("PaycheckReactive");
    paycheckReactive_Lasna = await PaycheckReactive.deploy(
      await mockWETH_Sepolia.getAddress(),
      user.address,
      ethers.ZeroAddress,
      MIN_INFLOW_THRESHOLD,
      COOLDOWN_SECONDS,
      { value: ethers.parseEther("0.1") }
    );
    const reactiveAddr = await paycheckReactive_Lasna.getAddress();

    // 5. Deploy Multi-Bucket PaycheckVault on Base Sepolia bound to reactiveAddr
    const PaycheckVault = await ethers.getContractFactory("PaycheckVault");
    paycheckVault_Base = await PaycheckVault.deploy(
      relayer.address,
      reactiveAddr,
      await mockDEX_Base.getAddress(),
      await mockWETH_Base.getAddress(),
      await mockUSDC_Base.getAddress(),
      await mockSUSDC_Base.getAddress(),
      STABLE_BPS,
      YIELD_BPS,
      { value: ethers.parseEther("0.02") }
    );

    // 6. Bind vault destination on Lasna PaycheckReactive
    await paycheckReactive_Lasna.setDestinationVault(await paycheckVault_Base.getAddress());

    // Pre-fund Base Vault with operating WETH balance
    await mockWETH_Base.mint(await paycheckVault_Base.getAddress(), ethers.parseUnits("10", 18));
  });

  it("Should verify _CALLBACK_SENDER matches Lasna PaycheckReactive address", async function () {
    expect(await paycheckVault_Base.getCallbackSender()).to.equal(
      await paycheckReactive_Lasna.getAddress()
    );
    expect(await paycheckVault_Base.allocationBps()).to.equal(8000n);
  });

  it("Should request cross-chain callback via Omni SYSTEM in PaycheckReactive.react()", async function () {
    const inflowAmount = ethers.parseUnits("1", 18); // 1 WETH
    const logRecord = buildTransferLog(
      await mockWETH_Sepolia.getAddress(),
      employer.address,
      user.address,
      inflowAmount
    );

    const tx = paycheckReactive_Lasna.connect(systemSigner).react(logRecord);
    await expect(tx)
      .to.emit(systemContract, "CallbackRequest")
      .withArgs(
        BASE_SEPOLIA_CHAIN_ID,
        await paycheckReactive_Lasna.getAddress(),
        await paycheckVault_Base.getAddress(),
        0,
        (cfg) => cfg && cfg.length > 0
      );
    await expect(tx)
      .to.emit(paycheckReactive_Lasna, "PaycheckTriggered")
      .withArgs(inflowAmount, await paycheckVault_Base.getAddress(), (v) => v > 0);

    expect(await paycheckReactive_Lasna.totalCallbacksEmitted()).to.equal(1n);
  });

  it("Should ignore dust transfers below minInflowThreshold and emit InflowSuppressed", async function () {
    const dustAmount = ethers.parseUnits("0.002", 18); // < 0.01 WETH threshold
    const logRecord = buildTransferLog(
      await mockWETH_Sepolia.getAddress(),
      employer.address,
      user.address,
      dustAmount,
      101n
    );

    const tx = paycheckReactive_Lasna.connect(systemSigner).react(logRecord);
    await expect(tx).to.not.emit(systemContract, "CallbackRequest");
    await expect(tx)
      .to.emit(paycheckReactive_Lasna, "InflowSuppressed")
      .withArgs(dustAmount, "DUST_THRESHOLD", (v) => v > 0);
    expect(await paycheckReactive_Lasna.totalDustBlocked()).to.equal(1n);
  });

  it("Should enforce cooldown rate-limiter on rapid back-to-back transfers and resume after cooldown", async function () {
    const inflowAmount = ethers.parseUnits("0.5", 18);
    const tokenAddr = await mockWETH_Sepolia.getAddress();

    await expect(
      paycheckReactive_Lasna
        .connect(systemSigner)
        .react(buildTransferLog(tokenAddr, employer.address, user.address, inflowAmount, 200n))
    ).to.emit(systemContract, "CallbackRequest");

    const blockedTx = paycheckReactive_Lasna
      .connect(systemSigner)
      .react(buildTransferLog(tokenAddr, employer.address, user.address, inflowAmount, 201n));
    await expect(blockedTx).to.not.emit(systemContract, "CallbackRequest");
    await expect(blockedTx)
      .to.emit(paycheckReactive_Lasna, "InflowSuppressed")
      .withArgs(inflowAmount, "COOLDOWN", (v) => v > 0);
    expect(await paycheckReactive_Lasna.totalCooldownBlocked()).to.equal(1n);

    await time.increase(35);

    await expect(
      paycheckReactive_Lasna
        .connect(systemSigner)
        .react(buildTransferLog(tokenAddr, employer.address, user.address, inflowAmount, 202n))
    ).to.emit(systemContract, "CallbackRequest");
    expect(await paycheckReactive_Lasna.totalCallbacksEmitted()).to.equal(2n);
  });

  it("Should split Base Sepolia callback into 3 buckets: 50% USDC Reserve, 30% sUSDC Yield, 20% retained WETH", async function () {
    const inflowAmount = ethers.parseUnits("1", 18); // 1 WETH ($2,500)
    const reactiveAddr = await paycheckReactive_Lasna.getAddress();

    await expect(
      paycheckVault_Base.connect(relayer).executePaycheckAllocation(reactiveAddr, inflowAmount)
    )
      .to.emit(paycheckVault_Base, "MultiBucketAllocated")
      .withArgs(
        reactiveAddr,
        ethers.parseUnits("1", 18),
        ethers.parseUnits("1250", 18), // 50% = 0.5 WETH -> 1,250 USDC
        ethers.parseUnits("750", 18),  // 30% = 0.3 WETH -> 750 sUSDC
        ethers.parseUnits("0.2", 18),  // 20% = 0.2 WETH retained
        (val) => val > 0
      );

    expect(await mockWETH_Base.balanceOf(await paycheckVault_Base.getAddress())).to.equal(
      ethers.parseUnits("9.2", 18)
    );
    expect(await mockUSDC_Base.balanceOf(await paycheckVault_Base.getAddress())).to.equal(
      ethers.parseUnits("1250", 18)
    );
    expect(await mockSUSDC_Base.balanceOf(await paycheckVault_Base.getAddress())).to.equal(
      ethers.parseUnits("750", 18)
    );
  });

  it("Should cap oversized callbacks using maxSingleAllocation guardrail", async function () {
    const cap = ethers.parseUnits("2", 18);
    await paycheckVault_Base.connect(owner).setGuardrails(cap, 0);
    const reactiveAddr = await paycheckReactive_Lasna.getAddress();

    const hugeInflow = ethers.parseUnits("8", 18);
    await expect(
      paycheckVault_Base.connect(relayer).executePaycheckAllocation(reactiveAddr, hugeInflow)
    )
      .to.emit(paycheckVault_Base, "MultiBucketAllocated")
      .withArgs(
        reactiveAddr,
        cap,
        ethers.parseUnits("2500", 18),
        ethers.parseUnits("1500", 18),
        ethers.parseUnits("0.4", 18),
        (val) => val > 0
      );
  });

  it("Should revert swap if DEX output drops below minStableOutPerInput slippage guardrail", async function () {
    await paycheckVault_Base
      .connect(owner)
      .setGuardrails(0, ethers.parseUnits("2200", 18));

    await mockDEX_Base.setPairRate(
      await mockWETH_Base.getAddress(),
      await mockUSDC_Base.getAddress(),
      ethers.parseEther("1800")
    );

    const reactiveAddr = await paycheckReactive_Lasna.getAddress();
    await expect(
      paycheckVault_Base
        .connect(relayer)
        .executePaycheckAllocation(reactiveAddr, ethers.parseUnits("1", 18))
    ).to.be.revertedWith("Slippage exceeded");
  });

  it("Should allow owner to update bucket splits, withdraw reserves, and reimburse proxy gas", async function () {
    await expect(paycheckVault_Base.connect(owner).setBuckets(7000, 2000))
      .to.emit(paycheckVault_Base, "BucketsUpdated")
      .withArgs(7000n, 2000n, 1000n);

    await expect(paycheckVault_Base.connect(owner).setBuckets(7000, 3500)).to.be.revertedWith(
      "Invalid bps"
    );

    const fee = ethers.parseEther("0.001");
    await expect(paycheckVault_Base.connect(relayer).pay(fee)).to.changeEtherBalances(
      [paycheckVault_Base, relayer],
      [-fee, fee]
    );

    const withdrawAmt = ethers.parseUnits("1", 18);
    await expect(
      paycheckVault_Base.connect(owner).withdraw(await mockWETH_Base.getAddress(), withdrawAmt)
    )
      .to.emit(paycheckVault_Base, "Withdrawn")
      .withArgs(await mockWETH_Base.getAddress(), owner.address, withdrawAmt);
  });

  it("Should strictly reject unauthorized relayer, unauthorized reactive sender, or non-SYSTEM react call", async function () {
    const inflowAmount = ethers.parseUnits("1", 18);
    const reactiveAddr = await paycheckReactive_Lasna.getAddress();

    await expect(
      paycheckVault_Base.connect(user).executePaycheckAllocation(reactiveAddr, inflowAmount)
    ).to.be.revertedWithCustomError(paycheckVault_Base, "NotAuthorized");

    await expect(
      paycheckVault_Base.connect(relayer).executePaycheckAllocation(user.address, inflowAmount)
    ).to.be.revertedWithCustomError(paycheckVault_Base, "CallbackNotAuthorized");

    const logRecord = buildTransferLog(
      await mockWETH_Sepolia.getAddress(),
      employer.address,
      user.address,
      inflowAmount
    );
    await expect(
      paycheckReactive_Lasna.connect(user).react(logRecord)
    ).to.be.revertedWithCustomError(paycheckReactive_Lasna, "NotAuthorized");
  });
});

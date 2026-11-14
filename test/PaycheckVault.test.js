import { expect } from "chai";
import hardhat from "hardhat";
import { time } from "@nomicfoundation/hardhat-toolbox/network-helpers.js";
const { ethers } = hardhat;

describe("PaycheckVault Multi-Bucket Stablecoin & Guardrail Suite", function () {
  let owner, employer, relayer, user;
  let mockWETH_Sepolia, mockWETH_Base, mockUSDC_Base, mockSUSDC_Base, mockDEX_Base;
  let paycheckVault_Base, paycheckReactive_Lasna;

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
      chain_id: SEPOLIA_CHAIN_ID,
      _contract: tokenAddr,
      topic_0: BigInt(ethers.id("Transfer(address,address,uint256)")),
      topic_1: BigInt(from),
      topic_2: BigInt(to),
      topic_3: 0n,
      data: ethers.AbiCoder.defaultAbiCoder().encode(["uint256"], [amount]),
      block_number: blockNum,
      op_code: 3n,
      block_hash: 1n,
      tx_hash: blockNum,
      log_index: 0n,
    };
  }

  beforeEach(async function () {
    [owner, employer, relayer, user] = await ethers.getSigners();

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

    // 4. Deploy Multi-Bucket PaycheckVault on Base Sepolia
    const PaycheckVault = await ethers.getContractFactory("PaycheckVault");
    paycheckVault_Base = await PaycheckVault.deploy(
      relayer.address,
      await mockDEX_Base.getAddress(),
      await mockWETH_Base.getAddress(),
      await mockUSDC_Base.getAddress(),
      await mockSUSDC_Base.getAddress(),
      STABLE_BPS,
      YIELD_BPS,
      { value: ethers.parseEther("0.02") }
    );

    // 5. Deploy PaycheckReactive on Lasna with Dust & Cooldown Guardrails
    const PaycheckReactive = await ethers.getContractFactory("PaycheckReactive");
    paycheckReactive_Lasna = await PaycheckReactive.deploy(
      await mockWETH_Sepolia.getAddress(),
      user.address,
      await paycheckVault_Base.getAddress(),
      MIN_INFLOW_THRESHOLD,
      COOLDOWN_SECONDS
    );

    // Pre-fund Base Vault with operating WETH balance
    await mockWETH_Base.mint(await paycheckVault_Base.getAddress(), ethers.parseUnits("10", 18));
  });

  it("Should verify that rvm_id matches deployer wallet address", async function () {
    expect(await paycheckVault_Base.getRvmId()).to.equal(owner.address);
    expect(await paycheckVault_Base.allocationBps()).to.equal(8000n);
  });

  it("Should emit Callback in PaycheckReactive.react() when valid Sepolia inflow arrives", async function () {
    const inflowAmount = ethers.parseUnits("1", 18); // 1 WETH
    const logRecord = buildTransferLog(
      await mockWETH_Sepolia.getAddress(),
      employer.address,
      user.address,
      inflowAmount
    );

    const expectedPayload = new ethers.Interface([
      "function executePaycheckAllocation(address,uint256)",
    ]).encodeFunctionData("executePaycheckAllocation", [ethers.ZeroAddress, inflowAmount]);

    await expect(paycheckReactive_Lasna.react(logRecord))
      .to.emit(paycheckReactive_Lasna, "Callback")
      .withArgs(
        BASE_SEPOLIA_CHAIN_ID,
        await paycheckVault_Base.getAddress(),
        1000000,
        expectedPayload
      );

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

    const tx = paycheckReactive_Lasna.react(logRecord);
    await expect(tx).to.not.emit(paycheckReactive_Lasna, "Callback");
    await expect(tx)
      .to.emit(paycheckReactive_Lasna, "InflowSuppressed")
      .withArgs(dustAmount, "DUST_THRESHOLD", (v) => v > 0);
    expect(await paycheckReactive_Lasna.totalDustBlocked()).to.equal(1n);
  });

  it("Should enforce cooldown rate-limiter on rapid back-to-back transfers and resume after cooldown", async function () {
    const inflowAmount = ethers.parseUnits("0.5", 18);
    const tokenAddr = await mockWETH_Sepolia.getAddress();

    // First valid inflow triggers Callback
    await expect(
      paycheckReactive_Lasna.react(buildTransferLog(tokenAddr, employer.address, user.address, inflowAmount, 200n))
    ).to.emit(paycheckReactive_Lasna, "Callback");

    // Immediate second inflow within 30s cooldown is suppressed
    const blockedTx = paycheckReactive_Lasna.react(
      buildTransferLog(tokenAddr, employer.address, user.address, inflowAmount, 201n)
    );
    await expect(blockedTx).to.not.emit(paycheckReactive_Lasna, "Callback");
    await expect(blockedTx)
      .to.emit(paycheckReactive_Lasna, "InflowSuppressed")
      .withArgs(inflowAmount, "COOLDOWN", (v) => v > 0);
    expect(await paycheckReactive_Lasna.totalCooldownBlocked()).to.equal(1n);

    // Advance chain timestamp past 30s cooldown
    await time.increase(35);

    await expect(
      paycheckReactive_Lasna.react(buildTransferLog(tokenAddr, employer.address, user.address, inflowAmount, 202n))
    ).to.emit(paycheckReactive_Lasna, "Callback");
    expect(await paycheckReactive_Lasna.totalCallbacksEmitted()).to.equal(2n);
  });

  it("Should split Base Sepolia callback into 3 buckets: 50% USDC Reserve, 30% sUSDC Yield, 20% retained WETH", async function () {
    const inflowAmount = ethers.parseUnits("1", 18); // 1 WETH ($2,500)

    await expect(
      paycheckVault_Base.connect(relayer).executePaycheckAllocation(owner.address, inflowAmount)
    )
      .to.emit(paycheckVault_Base, "MultiBucketAllocated")
      .withArgs(
        owner.address,
        ethers.parseUnits("1", 18),
        ethers.parseUnits("1250", 18), // 50% = 0.5 WETH -> 1,250 USDC
        ethers.parseUnits("750", 18),  // 30% = 0.3 WETH -> 750 sUSDC
        ethers.parseUnits("0.2", 18),  // 20% = 0.2 WETH retained
        (val) => val > 0
      );

    // Initial 10 WETH - 0.8 WETH swapped = 9.2 WETH remaining in operating bucket
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
    const cap = ethers.parseUnits("2", 18); // Cap at 2 WETH max per callback
    await paycheckVault_Base.connect(owner).setGuardrails(cap, 0);

    const hugeInflow = ethers.parseUnits("8", 18);
    await expect(
      paycheckVault_Base.connect(relayer).executePaycheckAllocation(owner.address, hugeInflow)
    )
      .to.emit(paycheckVault_Base, "MultiBucketAllocated")
      .withArgs(
        owner.address,
        cap,
        ethers.parseUnits("2500", 18), // 50% of 2 WETH = 1 WETH -> 2,500 USDC
        ethers.parseUnits("1500", 18), // 30% of 2 WETH = 0.6 WETH -> 1,500 sUSDC
        ethers.parseUnits("0.4", 18),  // 20% of 2 WETH retained
        (val) => val > 0
      );
  });

  it("Should revert swap if DEX output drops below minStableOutPerInput slippage guardrail", async function () {
    // Require at least 2,200 USDC per WETH
    await paycheckVault_Base
      .connect(owner)
      .setGuardrails(0, ethers.parseUnits("2200", 18));

    // Simulate DEX price crash to 1,800 USDC per WETH
    await mockDEX_Base.setPairRate(
      await mockWETH_Base.getAddress(),
      await mockUSDC_Base.getAddress(),
      ethers.parseEther("1800")
    );

    await expect(
      paycheckVault_Base
        .connect(relayer)
        .executePaycheckAllocation(owner.address, ethers.parseUnits("1", 18))
    ).to.be.revertedWith("Slippage exceeded");
  });

  it("Should allow owner to update bucket splits, withdraw reserves, and reimburse relayer gas", async function () {
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

  it("Should strictly reject callback from unauthorized relayer or unauthorized RVM ID", async function () {
    const inflowAmount = ethers.parseUnits("1", 18);

    await expect(
      paycheckVault_Base.connect(user).executePaycheckAllocation(owner.address, inflowAmount)
    ).to.be.revertedWith("Authorized sender only");

    await expect(
      paycheckVault_Base.connect(relayer).executePaycheckAllocation(user.address, inflowAmount)
    ).to.be.revertedWith("Authorized RVM ID only");
  });
});

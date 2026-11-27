import { expect } from "chai";
import hardhat from "hardhat";
import { time, setBalance, setCode, impersonateAccount } from "@nomicfoundation/hardhat-toolbox/network-helpers.js";
const { ethers } = hardhat;

describe("PaycheckVault Multi-User Stablecoin & Omni Guardrail Suite", function () {
  let owner, employer, relayer, user, user2, systemSigner;
  let mockWETH_Sepolia, mockWETH_Base, mockUSDC_Base, mockSUSDC_Base, mockDEX_Base;
  let paycheckVault_Base, paycheckReactive_Lasna, systemContract;

  const SYSTEM_ADDRESS = "0x8888888888888888888888888888888888888888";
  const SEPOLIA_CHAIN_ID = 11155111n;
  const BASE_SEPOLIA_CHAIN_ID = 84532n;
  const STABLE_BPS = 5000;
  const YIELD_BPS = 3000;
  const MIN_INFLOW_THRESHOLD = ethers.parseUnits("0.01", 18);
  const COOLDOWN_SECONDS = 30n;
  const ETH_USDC_RATE = ethers.parseEther("2500");

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
    [owner, employer, relayer, user, user2] = await ethers.getSigners();

    const MockSystem = await ethers.getContractFactory("MockSystemContract");
    const deployedMockSys = await MockSystem.deploy();
    const runtimeCode = await ethers.provider.getCode(await deployedMockSys.getAddress());
    await setCode(SYSTEM_ADDRESS, runtimeCode);
    await setBalance(SYSTEM_ADDRESS, ethers.parseEther("10"));
    await impersonateAccount(SYSTEM_ADDRESS);
    systemSigner = await ethers.getSigner(SYSTEM_ADDRESS);
    systemContract = await ethers.getContractAt("MockSystemContract", SYSTEM_ADDRESS);

    const MockERC20 = await ethers.getContractFactory("MockERC20");
    mockWETH_Sepolia = await MockERC20.deploy("Sepolia Wrapped Ether", "WETH");
    mockWETH_Base = await MockERC20.deploy("Base Wrapped Ether", "WETH");
    mockUSDC_Base = await MockERC20.deploy("Base USD Coin", "USDC");
    mockSUSDC_Base = await MockERC20.deploy("Base Savings USD Coin", "sUSDC");

    const MockDEX = await ethers.getContractFactory("MockDEX");
    mockDEX_Base = await MockDEX.deploy(ETH_USDC_RATE);
    await mockDEX_Base.setPairRate(await mockWETH_Base.getAddress(), await mockUSDC_Base.getAddress(), ETH_USDC_RATE);
    await mockDEX_Base.setPairRate(await mockWETH_Base.getAddress(), await mockSUSDC_Base.getAddress(), ETH_USDC_RATE);

    await mockUSDC_Base.mint(await mockDEX_Base.getAddress(), ethers.parseUnits("5000000", 18));
    await mockSUSDC_Base.mint(await mockDEX_Base.getAddress(), ethers.parseUnits("5000000", 18));

    const PaycheckReactive = await ethers.getContractFactory("PaycheckReactive");
    paycheckReactive_Lasna = await PaycheckReactive.deploy(
      await mockWETH_Sepolia.getAddress(),
      ethers.ZeroAddress,
      ethers.ZeroAddress,
      MIN_INFLOW_THRESHOLD,
      COOLDOWN_SECONDS,
      { value: ethers.parseEther("0.1") }
    );
    const reactiveAddr = await paycheckReactive_Lasna.getAddress();

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

    await paycheckReactive_Lasna.setDestinationVault(await paycheckVault_Base.getAddress());

    // User 1 deposits 10 WETH into their Base Sepolia vault slice
    await mockWETH_Base.mint(user.address, ethers.parseUnits("10", 18));
    await mockWETH_Base.connect(user).approve(await paycheckVault_Base.getAddress(), ethers.parseUnits("10", 18));
    await paycheckVault_Base.connect(user).deposit(ethers.parseUnits("10", 18));
  });

  it("correlates equal transfers by log index and settles a callback only once", async function () {
    const amount = ethers.parseEther("1");
    const token = await mockWETH_Sepolia.getAddress();
    const receipt = { hash: ethers.toBeHex(100, 32), logs: [] };
    const transfer = mockWETH_Sepolia.interface.encodeEventLog("Transfer", [employer.address, user.address, amount]);
    const { originPaycheckId } = await import("../frontend/src/config/paycheck.js");
    for (const index of [0, 1]) {
      receipt.logs = [{ ...transfer, address: token, index }];
      const id = originPaycheckId(receipt, SEPOLIA_CHAIN_ID, token, user.address, amount);
      const log = { ...buildTransferLog(token, employer.address, user.address, amount), logIndex: index };
      const tx = await paycheckReactive_Lasna.connect(systemSigner).react(log);
      if (index === 1) {
        await expect(tx).to.emit(paycheckReactive_Lasna, "PaycheckSuppressed").withArgs(id, user.address, "COOLDOWN");
        continue;
      }
      await expect(tx).to.emit(paycheckReactive_Lasna, "PaycheckAccepted").withArgs(id, user.address);
      const request = (await tx.wait()).logs.map(entry => systemContract.interface.parseLog(entry))
        .find(event => event?.name === "CallbackRequest");
      const [config] = ethers.AbiCoder.defaultAbiCoder().decode(
        ["tuple(uint256 chainId,address recipient,uint64 gasLimit,bytes payload)"], request.args.configuration);
      const [, recipient, inflow, payloadId] = paycheckVault_Base.interface.decodeFunctionData("allocatePaycheck", config.payload);
      expect(payloadId).to.equal(id);
      const allocate = () => paycheckVault_Base.connect(relayer).allocatePaycheck(
        paycheckReactive_Lasna.target, recipient, inflow, payloadId);
      await expect(allocate()).to.emit(paycheckVault_Base, "PaycheckSettled").withArgs(id, user.address);
      await expect(allocate()).not.to.emit(paycheckVault_Base, "MultiBucketAllocated");
    }
  });

  it("updates the entire policy atomically and rejects invalid deployments", async function () {
    const vault = paycheckVault_Base.connect(user);
    await vault.setMyPolicy(4000, 3500, 12, 34);
    await expect(vault.setMyPolicy(8000, 3000, 0, 0)).to.be.revertedWith("Invalid bps");
    expect(await vault.getPolicy(user.address)).to.deep.equal([4000n, 3500n, 12n, 34n, true]);
    const factory = await ethers.getContractFactory("PaycheckVault");
    await expect(factory.deploy(relayer.address, paycheckReactive_Lasna.target, mockDEX_Base.target,
      mockWETH_Base.target, ethers.ZeroAddress, mockSUSDC_Base.target, STABLE_BPS, YIELD_BPS))
      .to.be.revertedWith("Invalid router or token");
  });

  it("Should verify _CALLBACK_SENDER matches Lasna PaycheckReactive and default policy is 50/30/20", async function () {
    expect(await paycheckVault_Base.getCallbackSender()).to.equal(await paycheckReactive_Lasna.getAddress());
    const policy = await paycheckVault_Base.getPolicy(user2.address);
    expect(policy.stableBps).to.equal(5000n);
    expect(policy.yieldBps).to.equal(3000n);
    expect(policy.configured).to.equal(false);
  });

  it("Should route wildcard Sepolia transfers for two independent users using separate cooldowns", async function () {
    const tokenAddr = await mockWETH_Sepolia.getAddress();
    const amt1 = ethers.parseUnits("1", 18);
    const amt2 = ethers.parseUnits("2", 18);

    const tx1 = paycheckReactive_Lasna
      .connect(systemSigner)
      .react(buildTransferLog(tokenAddr, employer.address, user.address, amt1, 100n));
    await expect(tx1).to.emit(systemContract, "CallbackRequest");
    await expect(tx1)
      .to.emit(paycheckReactive_Lasna, "PaycheckTriggered")
      .withArgs(user.address, amt1, await paycheckVault_Base.getAddress(), (v) => v > 0);

    // User 2 gets paid 2 seconds later and must NOT be blocked by User 1's cooldown
    const tx2 = paycheckReactive_Lasna
      .connect(systemSigner)
      .react(buildTransferLog(tokenAddr, employer.address, user2.address, amt2, 101n));
    await expect(tx2).to.emit(systemContract, "CallbackRequest");
    await expect(tx2)
      .to.emit(paycheckReactive_Lasna, "PaycheckTriggered")
      .withArgs(user2.address, amt2, await paycheckVault_Base.getAddress(), (v) => v > 0);

    // Rapid repeat for User 1 must still be blocked cleanly
    const blockedTx = paycheckReactive_Lasna
      .connect(systemSigner)
      .react(buildTransferLog(tokenAddr, employer.address, user.address, amt1, 102n));
    await expect(blockedTx).to.not.emit(systemContract, "CallbackRequest");
    await expect(blockedTx)
      .to.emit(paycheckReactive_Lasna, "InflowSuppressed")
      .withArgs(user.address, amt1, "COOLDOWN", (v) => v > 0);
  });

  it("Should ignore dust transfers below minInflowThreshold and emit InflowSuppressed", async function () {
    const dustAmount = ethers.parseUnits("0.002", 18);
    const tx = paycheckReactive_Lasna
      .connect(systemSigner)
      .react(buildTransferLog(await mockWETH_Sepolia.getAddress(), employer.address, user.address, dustAmount, 101n));

    await expect(tx).to.not.emit(systemContract, "CallbackRequest");
    await expect(tx)
      .to.emit(paycheckReactive_Lasna, "InflowSuppressed")
      .withArgs(user.address, dustAmount, "DUST_THRESHOLD", (v) => v > 0);
    expect(await paycheckReactive_Lasna.totalDustBlocked()).to.equal(1n);
  });

  it("Should resume user callbacks after cooldown expires", async function () {
    const inflowAmount = ethers.parseUnits("0.5", 18);
    const tokenAddr = await mockWETH_Sepolia.getAddress();

    await expect(
      paycheckReactive_Lasna
        .connect(systemSigner)
        .react(buildTransferLog(tokenAddr, employer.address, user.address, inflowAmount, 200n))
    ).to.emit(systemContract, "CallbackRequest");

    await time.increase(35);

    await expect(
      paycheckReactive_Lasna
        .connect(systemSigner)
        .react(buildTransferLog(tokenAddr, employer.address, user.address, inflowAmount, 202n))
    ).to.emit(systemContract, "CallbackRequest");
    expect(await paycheckReactive_Lasna.totalCallbacksEmitted()).to.equal(2n);
  });

  it("Should isolate Base Sepolia vault balances and custom policies per user", async function () {
    const reactiveAddr = await paycheckReactive_Lasna.getAddress();

    // User 2 deposits 2 WETH and sets custom 20% USDC / 70% sUSDC / 10% WETH policy
    await mockWETH_Base.mint(user2.address, ethers.parseUnits("2", 18));
    await mockWETH_Base.connect(user2).approve(await paycheckVault_Base.getAddress(), ethers.parseUnits("2", 18));
    await paycheckVault_Base.connect(user2).deposit(ethers.parseUnits("2", 18));
    await expect(paycheckVault_Base.connect(user2).setMyBuckets(2000, 7000))
      .to.emit(paycheckVault_Base, "PolicyUpdated")
      .withArgs(user2.address, 2000n, 7000n, 1000n);

    // Execute callback for User 1 (1 WETH at default 50/30/20)
    await expect(
      paycheckVault_Base
        .connect(relayer)
        .executePaycheckAllocation(reactiveAddr, user.address, ethers.parseUnits("1", 18))
    )
      .to.emit(paycheckVault_Base, "MultiBucketAllocated")
      .withArgs(
        user.address,
        reactiveAddr,
        ethers.parseUnits("1", 18),
        ethers.parseUnits("1250", 18),
        ethers.parseUnits("750", 18),
        ethers.parseUnits("0.2", 18),
        (v) => v > 0
      );

    // Execute callback for User 2 (1 WETH at custom 20/70/10)
    await expect(
      paycheckVault_Base
        .connect(relayer)
        .executePaycheckAllocation(reactiveAddr, user2.address, ethers.parseUnits("1", 18))
    )
      .to.emit(paycheckVault_Base, "MultiBucketAllocated")
      .withArgs(
        user2.address,
        reactiveAddr,
        ethers.parseUnits("1", 18),
        ethers.parseUnits("500", 18),
        ethers.parseUnits("1750", 18),
        ethers.parseUnits("0.1", 18),
        (v) => v > 0
      );

    const b1 = await paycheckVault_Base.balances(user.address);
    expect(b1.weth).to.equal(ethers.parseUnits("9.2", 18));
    expect(b1.usdc).to.equal(ethers.parseUnits("1250", 18));
    expect(b1.sUsdc).to.equal(ethers.parseUnits("750", 18));

    const b2 = await paycheckVault_Base.balances(user2.address);
    expect(b2.weth).to.equal(ethers.parseUnits("1.1", 18));
    expect(b2.usdc).to.equal(ethers.parseUnits("500", 18));
    expect(b2.sUsdc).to.equal(ethers.parseUnits("1750", 18));

    // Unfunded stranger callback must do nothing and must NOT touch User 1 or User 2 funds
    await paycheckVault_Base
      .connect(relayer)
      .executePaycheckAllocation(reactiveAddr, owner.address, ethers.parseUnits("5", 18));
    expect((await paycheckVault_Base.balances(user.address)).weth).to.equal(ethers.parseUnits("9.2", 18));
  });

  it("Should enforce per-user maxSingleAllocation cap and slippage floor guardrails", async function () {
    const reactiveAddr = await paycheckReactive_Lasna.getAddress();
    const cap = ethers.parseUnits("2", 18);
    await paycheckVault_Base.connect(user).setMyGuardrails(cap, 0);

    await expect(
      paycheckVault_Base
        .connect(relayer)
        .executePaycheckAllocation(reactiveAddr, user.address, ethers.parseUnits("8", 18))
    )
      .to.emit(paycheckVault_Base, "MultiBucketAllocated")
      .withArgs(
        user.address,
        reactiveAddr,
        cap,
        ethers.parseUnits("2500", 18),
        ethers.parseUnits("1500", 18),
        ethers.parseUnits("0.4", 18),
        (v) => v > 0
      );

    await paycheckVault_Base.connect(user).setMyGuardrails(0, ethers.parseUnits("2200", 18));
    await mockDEX_Base.setPairRate(
      await mockWETH_Base.getAddress(),
      await mockUSDC_Base.getAddress(),
      ethers.parseEther("1800")
    );
    await expect(
      paycheckVault_Base
        .connect(relayer)
        .executePaycheckAllocation(reactiveAddr, user.address, ethers.parseUnits("1", 18))
    ).to.be.revertedWith("Slippage exceeded");
  });

  it("Should allow each user to withdraw only their own bucket tokens and reimburse proxy gas", async function () {
    const reactiveAddr = await paycheckReactive_Lasna.getAddress();
    await paycheckVault_Base
      .connect(relayer)
      .executePaycheckAllocation(reactiveAddr, user.address, ethers.parseUnits("1", 18));

    const usdcAddr = await mockUSDC_Base.getAddress();
    const withdrawAmt = ethers.parseUnits("250", 18);

    // User 2 cannot withdraw User 1's USDC
    await expect(paycheckVault_Base.connect(user2).withdraw(usdcAddr, withdrawAmt)).to.be.revertedWith(
      "Insufficient balance"
    );

    // User 1 withdraws 250 USDC cleanly
    await expect(paycheckVault_Base.connect(user).withdraw(usdcAddr, withdrawAmt))
      .to.emit(paycheckVault_Base, "Withdrawn")
      .withArgs(user.address, usdcAddr, withdrawAmt);

    expect(await mockUSDC_Base.balanceOf(user.address)).to.equal(withdrawAmt);
    expect((await paycheckVault_Base.balances(user.address)).usdc).to.equal(ethers.parseUnits("1000", 18));

    const fee = ethers.parseEther("0.001");
    await expect(paycheckVault_Base.connect(relayer).pay(fee)).to.changeEtherBalances(
      [paycheckVault_Base, relayer],
      [-fee, fee]
    );
  });

  it("Should strictly reject unauthorized relayer, unauthorized reactive sender, or non-SYSTEM react call", async function () {
    const inflowAmount = ethers.parseUnits("1", 18);
    const reactiveAddr = await paycheckReactive_Lasna.getAddress();

    await expect(
      paycheckVault_Base.connect(user).executePaycheckAllocation(reactiveAddr, user.address, inflowAmount)
    ).to.be.revertedWithCustomError(paycheckVault_Base, "NotAuthorized");

    await expect(
      paycheckVault_Base.connect(relayer).executePaycheckAllocation(user.address, user.address, inflowAmount)
    ).to.be.revertedWithCustomError(paycheckVault_Base, "CallbackNotAuthorized");

    await expect(
      paycheckReactive_Lasna
        .connect(user)
        .react(buildTransferLog(await mockWETH_Sepolia.getAddress(), employer.address, user.address, inflowAmount))
    ).to.be.revertedWithCustomError(paycheckReactive_Lasna, "NotAuthorized");
  });

  it("Should auto-pull shortfall directly from user Base wallet when Auto-Split is approved", async function () {
    const reactiveAddr = await paycheckReactive_Lasna.getAddress();
    const vaultAddr = await paycheckVault_Base.getAddress();
    const inflowAmount = ethers.parseUnits("1", 18);

    // user2 has 0 vault balance, mints 1 WETH to wallet and approves vault once
    await mockWETH_Base.mint(user2.address, inflowAmount);
    await mockWETH_Base.connect(user2).approve(vaultAddr, ethers.MaxUint256);

    await expect(
      paycheckVault_Base.connect(relayer).allocatePaycheck(reactiveAddr, user2.address, inflowAmount, ethers.toBeHex(77, 32))
    )
      .to.emit(paycheckVault_Base, "MultiBucketAllocated")
      .withArgs(
        user2.address,
        reactiveAddr,
        inflowAmount,
        ethers.parseUnits("1250", 18),
        ethers.parseUnits("750", 18),
        ethers.parseUnits("0.2", 18),
        (v) => v > 0
      );

    expect(await mockWETH_Base.balanceOf(user2.address)).to.equal(0n);
    const bal2 = await paycheckVault_Base.balances(user2.address);
    expect(bal2.usdc).to.equal(ethers.parseUnits("1250", 18));
    expect(bal2.sUsdc).to.equal(ethers.parseUnits("750", 18));
    expect(bal2.weth).to.equal(ethers.parseUnits("0.2", 18));
  });

  it("Should support Base Sepolia dual-chain auto-split while ignoring mints, vault, and DEX swaps", async function () {
    const baseWethAddr = await mockWETH_Base.getAddress();
    const baseDexAddr = await mockDEX_Base.getAddress();
    const vaultAddr = await paycheckVault_Base.getAddress();
    const amount = ethers.parseUnits("1", 18);

    await paycheckReactive_Lasna.enableBaseAutoSplit(baseWethAddr, baseDexAddr);

    // Valid Base WETH transfer from employer -> user2 triggers callback
    const baseLog = {
      ...buildTransferLog(baseWethAddr, employer.address, user2.address, amount, 300n),
      chainId: BASE_SEPOLIA_CHAIN_ID,
    };
    await expect(paycheckReactive_Lasna.connect(systemSigner).react(baseLog)).to.emit(systemContract, "CallbackRequest");

    // Loop prevention: mint (from=0), vault transfer, and DEX swap must be ignored
    for (const [from, to] of [
      [ethers.ZeroAddress, user2.address],
      [vaultAddr, user2.address],
      [user2.address, vaultAddr],
      [user2.address, baseDexAddr],
    ]) {
      const ignored = {
        ...buildTransferLog(baseWethAddr, from, to, amount, 301n),
        chainId: BASE_SEPOLIA_CHAIN_ID,
      };
      await expect(paycheckReactive_Lasna.connect(systemSigner).react(ignored)).to.not.emit(
        systemContract,
        "CallbackRequest"
      );
    }
  });

  it("Should queue cooldown-blocked inflows in pendingInflow and flush on next valid trigger", async function () {
    const tokenAddr = await mockWETH_Sepolia.getAddress();
    const firstAmt = ethers.parseUnits("1", 18);
    const queuedAmt = ethers.parseUnits("0.5", 18);
    const flushAmt = ethers.parseUnits("1", 18);

    await expect(
      paycheckReactive_Lasna.connect(systemSigner).react(buildTransferLog(tokenAddr, employer.address, user.address, firstAmt, 400n))
    ).to.emit(systemContract, "CallbackRequest");

    // Within 30s cooldown: queued instead of dropped
    await expect(
      paycheckReactive_Lasna.connect(systemSigner).react(buildTransferLog(tokenAddr, employer.address, user.address, queuedAmt, 401n))
    ).to.emit(paycheckReactive_Lasna, "InflowSuppressed");
    expect(await paycheckReactive_Lasna.pendingInflow(user.address)).to.equal(queuedAmt);

    await time.increase(35);

    // Next valid inflow flushes queuedAmt + flushAmt = 1.5 WETH
    await expect(
      paycheckReactive_Lasna.connect(systemSigner).react(buildTransferLog(tokenAddr, employer.address, user.address, flushAmt, 402n))
    )
      .to.emit(paycheckReactive_Lasna, "PaycheckTriggered")
      .withArgs(user.address, queuedAmt + flushAmt, await paycheckVault_Base.getAddress(), (v) => v > 0);
    expect(await paycheckReactive_Lasna.pendingInflow(user.address)).to.equal(0n);
  });
});

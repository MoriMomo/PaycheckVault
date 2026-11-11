import { expect } from "chai";
import hardhat from "hardhat";
const { ethers } = hardhat;

describe("PaycheckVault Cross-Chain Architecture Suite (Sepolia -> Lasna -> Base Sepolia)", function () {
  let owner, employer, relayer, user;
  let mockUSDC_Sepolia, mockUSDC_Base, mockWETH_Base, mockDEX_Base;
  let paycheckVault_Base, paycheckReactive_Lasna;

  const SEPOLIA_CHAIN_ID = 11155111n;
  const BASE_SEPOLIA_CHAIN_ID = 84532n;
  const ALLOCATION_BPS = 5000; // 50%
  const MIN_INFLOW_THRESHOLD = ethers.parseUnits("10", 18); // 10 USDC

  beforeEach(async function () {
    [owner, employer, relayer, user] = await ethers.getSigners();

    const MockERC20 = await ethers.getContractFactory("MockERC20");

    // 1. Sepolia Token (Origin)
    mockUSDC_Sepolia = await MockERC20.deploy("Sepolia USDC", "USDC");

    // 2. Base Sepolia Tokens (Destination)
    mockUSDC_Base = await MockERC20.deploy("Base USDC", "USDC");
    mockWETH_Base = await MockERC20.deploy("Base WETH", "WETH");

    // 3. Base Sepolia MockDEX
    const MockDEX = await ethers.getContractFactory("MockDEX");
    mockDEX_Base = await MockDEX.deploy(ethers.parseEther("0.5")); // 1 USDC = 0.5 WETH

    // Fund Base DEX with WETH liquidity
    await mockWETH_Base.mint(await mockDEX_Base.getAddress(), ethers.parseEther("100000"));

    // 4. Deploy PaycheckVault on Base Sepolia (funded with 0.02 ETH for callback proxy gas)
    const PaycheckVault = await ethers.getContractFactory("PaycheckVault");
    paycheckVault_Base = await PaycheckVault.deploy(
      relayer.address,
      await mockDEX_Base.getAddress(),
      await mockUSDC_Base.getAddress(),
      await mockWETH_Base.getAddress(),
      ALLOCATION_BPS,
      { value: ethers.parseEther("0.02") }
    );

    // 5. Deploy PaycheckReactive on Lasna
    const PaycheckReactive = await ethers.getContractFactory("PaycheckReactive");
    paycheckReactive_Lasna = await PaycheckReactive.deploy(
      await mockUSDC_Sepolia.getAddress(),
      user.address, // Monitored recipient wallet on Sepolia
      await paycheckVault_Base.getAddress(),
      MIN_INFLOW_THRESHOLD
    );

    // Pre-fund Base Vault with USDC (simulating user's liquid cash on Base)
    await mockUSDC_Base.mint(await paycheckVault_Base.getAddress(), ethers.parseUnits("1000", 18));
  });

  it("Should verify that rvm_id matches deployer wallet address", async function () {
    expect(await paycheckVault_Base.getRvmId()).to.equal(owner.address);
  });

  it("Should emit Callback in PaycheckReactive.react() when valid Sepolia Transfer log arrives", async function () {
    const inflowAmount = ethers.parseUnits("200", 18);
    const transferTopic0 = await paycheckReactive_Lasna.ERC20_TRANSFER_TOPIC_0();

    const logRecord = {
      chain_id: SEPOLIA_CHAIN_ID,
      _contract: await mockUSDC_Sepolia.getAddress(),
      topic_0: transferTopic0,
      topic_1: BigInt(employer.address),
      topic_2: BigInt(user.address),
      topic_3: 0n,
      data: ethers.AbiCoder.defaultAbiCoder().encode(["uint256"], [inflowAmount]),
      block_number: 100n,
      op_code: 3n,
      block_hash: 1n,
      tx_hash: 2n,
      log_index: 0n,
    };

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
  });

  it("Should ignore dust transfers below minInflowThreshold in PaycheckReactive.react()", async function () {
    const dustAmount = ethers.parseUnits("5", 18); // < 10 USDC threshold
    const transferTopic0 = await paycheckReactive_Lasna.ERC20_TRANSFER_TOPIC_0();

    const logRecord = {
      chain_id: SEPOLIA_CHAIN_ID,
      _contract: await mockUSDC_Sepolia.getAddress(),
      topic_0: transferTopic0,
      topic_1: BigInt(employer.address),
      topic_2: BigInt(user.address),
      topic_3: 0n,
      data: ethers.AbiCoder.defaultAbiCoder().encode(["uint256"], [dustAmount]),
      block_number: 101n,
      op_code: 3n,
      block_hash: 1n,
      tx_hash: 2n,
      log_index: 0n,
    };

    await expect(paycheckReactive_Lasna.react(logRecord)).to.not.emit(
      paycheckReactive_Lasna,
      "Callback"
    );
  });

  it("Should process cross-chain callback from Reactive relayer and execute allocation on Base", async function () {
    const inflowAmount = ethers.parseUnits("200", 18);

    // Relayer delivers callback on Base Sepolia: executePaycheckAllocation(rvm_id, inflowAmount)
    await expect(
      paycheckVault_Base.connect(relayer).executePaycheckAllocation(owner.address, inflowAmount)
    )
      .to.emit(paycheckVault_Base, "PaycheckAllocated")
      .withArgs(owner.address, ethers.parseUnits("100", 18), ethers.parseUnits("50", 18), (val) => val > 0);

    // Initial 1000 USDC on Base -> 100 swapped -> 900 remaining
    expect(await mockUSDC_Base.balanceOf(await paycheckVault_Base.getAddress())).to.equal(
      ethers.parseUnits("900", 18)
    );
    // Acquired 50 WETH
    expect(await mockWETH_Base.balanceOf(await paycheckVault_Base.getAddress())).to.equal(
      ethers.parseUnits("50", 18)
    );
  });

  it("Should reimburse callback proxy gas via pay() from PaycheckVault ETH reserve", async function () {
    const fee = ethers.parseEther("0.001");
    await expect(paycheckVault_Base.connect(relayer).pay(fee)).to.changeEtherBalances(
      [paycheckVault_Base, relayer],
      [-fee, fee]
    );
  });

  it("Should reject invalid allocationBps > 10000 in setConfig", async function () {
    await expect(
      paycheckVault_Base.connect(owner).setConfig(
        await mockDEX_Base.getAddress(),
        await mockUSDC_Base.getAddress(),
        await mockWETH_Base.getAddress(),
        10001
      )
    ).to.be.revertedWith("Invalid bps");
  });

  it("Should strictly reject callback from unauthorized relayer", async function () {
    const inflowAmount = ethers.parseUnits("100", 18);

    await expect(
      paycheckVault_Base.connect(user).executePaycheckAllocation(owner.address, inflowAmount)
    ).to.be.revertedWith("Authorized sender only");
  });

  it("Should strictly reject callback with unauthorized RVM ID", async function () {
    const inflowAmount = ethers.parseUnits("100", 18);

    await expect(
      paycheckVault_Base.connect(relayer).executePaycheckAllocation(user.address, inflowAmount)
    ).to.be.revertedWith("Authorized RVM ID only");
  });
});

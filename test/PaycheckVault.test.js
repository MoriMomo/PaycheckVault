import { expect } from "chai";
import hardhat from "hardhat";
const { ethers } = hardhat;

describe("PaycheckVault Cross-Chain Architecture Suite (Sepolia -> Lasna -> Base Sepolia)", function () {
  let owner, employer, relayer, user;
  let mockUSDC_Sepolia, mockUSDC_Base, mockWETH_Base, mockDEX_Base;
  let paycheckVault_Base, paycheckReactive_Lasna;

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

    // 4. Deploy PaycheckVault on Base Sepolia
    // relayer represents the Base Sepolia Callback Proxy
    const PaycheckVault = await ethers.getContractFactory("PaycheckVault");
    paycheckVault_Base = await PaycheckVault.deploy(
      relayer.address,
      await mockDEX_Base.getAddress(),
      await mockUSDC_Base.getAddress(),
      await mockWETH_Base.getAddress(),
      ALLOCATION_BPS
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

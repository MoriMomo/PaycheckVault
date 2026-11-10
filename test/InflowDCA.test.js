import { expect } from "chai";
import hardhat from "hardhat";
const { ethers } = hardhat;

describe("Inflow DCA End-to-End Suite", function () {
  let owner, employer, relayer, user;
  let mockUSDC, mockWETH, mockDEX, inflowVault, reactiveDCA;

  const SEPOLIA_CHAIN_ID = 11155111;
  const BASE_SEPOLIA_CHAIN_ID = 84532;
  const DCA_PERCENTAGE_BPS = 5000; // 50%

  beforeEach(async function () {
    [owner, employer, relayer, user] = await ethers.getSigners();

    // 1. Deploy Mock Tokens
    const MockERC20 = await ethers.getContractFactory("MockERC20");
    mockUSDC = await MockERC20.deploy("USD Coin", "USDC");
    mockWETH = await MockERC20.deploy("Wrapped Ether", "WETH");

    // 2. Deploy Mock DEX with rate 0.5 (1 USDC = 0.5 WETH for testing)
    const MockDEX = await ethers.getContractFactory("MockDEX");
    mockDEX = await MockDEX.deploy(ethers.parseEther("0.5"));

    // Fund the DEX with WETH for liquidity
    await mockWETH.mint(await mockDEX.getAddress(), ethers.parseEther("100000"));

    // 3. Deploy InflowVault (Destination & Origin Vault)
    // Note: for testing callback authorization, relayer address is passed as callback sender
    const InflowVault = await ethers.getContractFactory("InflowVault");
    inflowVault = await InflowVault.deploy(
      relayer.address,
      await mockDEX.getAddress(),
      await mockUSDC.getAddress(),
      await mockWETH.getAddress(),
      DCA_PERCENTAGE_BPS
    );

    // 4. Deploy InflowDCAReactive
    const InflowDCAReactive = await ethers.getContractFactory("InflowDCAReactive");
    reactiveDCA = await InflowDCAReactive.deploy(
      SEPOLIA_CHAIN_ID,
      BASE_SEPOLIA_CHAIN_ID,
      await inflowVault.getAddress(),
      await inflowVault.getAddress()
    );

    // Fund employer with USDC
    await mockUSDC.mint(employer.address, ethers.parseUnits("1000", 18));
  });

  it("Should deposit inflow and emit InflowReceived event", async function () {
    const depositAmount = ethers.parseUnits("500", 18);
    await mockUSDC.connect(employer).approve(await inflowVault.getAddress(), depositAmount);

    await expect(inflowVault.connect(employer).deposit(depositAmount))
      .to.emit(inflowVault, "InflowReceived")
      .withArgs(employer.address, await mockUSDC.getAddress(), depositAmount, (val) => val > 0);

    expect(await mockUSDC.balanceOf(await inflowVault.getAddress())).to.equal(depositAmount);
  });

  it("Should process Reactive callback and execute DCA swap on destination", async function () {
    const depositAmount = ethers.parseUnits("500", 18);
    await mockUSDC.connect(employer).approve(await inflowVault.getAddress(), depositAmount);
    await inflowVault.connect(employer).deposit(depositAmount);

    // Emulate the Reactive Network Relayer delivering the callback with the authorized RVM ID
    // RVM ID is the address that deployed InflowVault (owner)
    const rvmId = owner.address;

    // Relayer calls executeInflowDCA(sender, inflowAmount)
    await expect(inflowVault.connect(relayer).executeInflowDCA(rvmId, depositAmount))
      .to.emit(inflowVault, "DCASwapped");

    // 50% of 500 USDC = 250 USDC swapped into WETH
    // Remaining USDC = 250
    expect(await mockUSDC.balanceOf(await inflowVault.getAddress())).to.equal(
      ethers.parseUnits("250", 18)
    );

    // Rate is 0.5, so 250 USDC -> 125 WETH
    expect(await mockWETH.balanceOf(await inflowVault.getAddress())).to.equal(
      ethers.parseUnits("125", 18)
    );
  });

  it("Should reject unauthorized callback sender or wrong RVM ID", async function () {
    const depositAmount = ethers.parseUnits("100", 18);

    // Attacker tries to impersonate callback directly
    await expect(
      inflowVault.connect(user).executeInflowDCA(user.address, depositAmount)
    ).to.be.revertedWith("Authorized sender only");

    // Relayer tries with unauthorized RVM ID
    await expect(
      inflowVault.connect(relayer).executeInflowDCA(user.address, depositAmount)
    ).to.be.revertedWith("Authorized RVM ID only");
  });
});

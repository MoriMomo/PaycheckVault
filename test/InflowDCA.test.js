import { expect } from "chai";
import hardhat from "hardhat";
const { ethers } = hardhat;

describe("Inflow DCA Hardened Architecture Suite", function () {
  let owner, employer, relayer, user;
  let mockUSDC, mockWETH, mockDEX, inflowVault, reactiveDCA;

  const SEPOLIA_CHAIN_ID = 11155111;
  const BASE_SEPOLIA_CHAIN_ID = 84532;
  const DCA_PERCENTAGE_BPS = 5000; // 50%
  const MIN_INFLOW_THRESHOLD = ethers.parseUnits("10", 18); // 10 USDC

  beforeEach(async function () {
    [owner, employer, relayer, user] = await ethers.getSigners();

    // 1. Deploy Mock Tokens
    const MockERC20 = await ethers.getContractFactory("MockERC20");
    mockUSDC = await MockERC20.deploy("USD Coin", "USDC");
    mockWETH = await MockERC20.deploy("Wrapped Ether", "WETH");

    // 2. Deploy Mock DEX with rate 0.5 (1 USDC = 0.5 WETH)
    const MockDEX = await ethers.getContractFactory("MockDEX");
    mockDEX = await MockDEX.deploy(ethers.parseEther("0.5"));

    // Fund DEX with WETH liquidity
    await mockWETH.mint(await mockDEX.getAddress(), ethers.parseEther("100000"));

    // 3. Deploy InflowVault (owner is deployer -> rvm_id = owner.address)
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
      await mockUSDC.getAddress(),
      await inflowVault.getAddress(),
      await inflowVault.getAddress(),
      MIN_INFLOW_THRESHOLD
    );

    // Fund employer with 1,000 USDC
    await mockUSDC.mint(employer.address, ethers.parseUnits("1000", 18));
  });

  it("Should set deployer address as authorized rvm_id at construction time", async function () {
    expect(await inflowVault.getRvmId()).to.equal(owner.address);
  });

  it("Should accept direct ERC20 transfer to vault address and execute swap on callback", async function () {
    // Direct ERC-20 transfer from employer to vault address (e.g. paycheck transfer)
    const transferAmount = ethers.parseUnits("200", 18);
    await mockUSDC.connect(employer).transfer(await inflowVault.getAddress(), transferAmount);

    expect(await mockUSDC.balanceOf(await inflowVault.getAddress())).to.equal(transferAmount);

    // Reactive relayer delivers callback with the deployer's address as rvm_id (owner.address)
    await expect(
      inflowVault.connect(relayer).executeInflowDCA(owner.address, transferAmount)
    )
      .to.emit(inflowVault, "DCASwapped")
      .withArgs(owner.address, ethers.parseUnits("100", 18), ethers.parseUnits("50", 18), (val) => val > 0);

    // 50% swapped: 100 USDC remaining, 50 WETH acquired
    expect(await mockUSDC.balanceOf(await inflowVault.getAddress())).to.equal(
      ethers.parseUnits("100", 18)
    );
    expect(await mockWETH.balanceOf(await inflowVault.getAddress())).to.equal(
      ethers.parseUnits("50", 18)
    );
  });

  it("Should reject callbacks with unauthorized RVM ID", async function () {
    const amount = ethers.parseUnits("100", 18);
    await mockUSDC.connect(employer).transfer(await inflowVault.getAddress(), amount);

    // Attempt callback using unauthorized sender address (user.address instead of owner.address)
    await expect(
      inflowVault.connect(relayer).executeInflowDCA(user.address, amount)
    ).to.be.revertedWith("Authorized RVM ID only");
  });
});

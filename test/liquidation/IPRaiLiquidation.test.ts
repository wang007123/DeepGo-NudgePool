import { expect } from "chai";
import { ethers } from "hardhat";
import { Signer } from "ethers";
import { getBigNumber, sleep } from "../utils";
import loger from '../utils/fs';

describe("IP raising liquidation", function() {
    before(async function() {
    loger("===================================================================================");
    loger("test time: " + new Date().toString());
    loger("-------------- Task Description -------------");
    loger("test name: IP raising liquidation");
    loger("swap IPToken for BaseToken");
    
    const NPSwapAddress = "0xBDe5627a0bFf2343866d48570D76427DFe323cCa";
    const NudgePoolAddress = "0x4c55745CAcB87A9d1F0B71A8F40dfa8E03a93003";
    const NudgePoolStatusAddress = "0x09B6BbefDED2873440f11e5eC18899AD1FdE3833";
    const UniswapRouterAddress = "0x7a250d5630B4cF539739dF2C5dAcb4c659F2488D";

    this.token1 = "0xe09D4de9f1dCC8A4d5fB19c30Fb53830F8e2a047";
    this.token2 = "0xDA2E05B28c42995D0FE8235861Da5124C1CE81Dd";
    this.pairToken = "0xBa1DAcD5f9E909A01B1c8d22429C8ADa9a372F89";
    this.dgt = "0xB6d7Bf947d4D6321FD863ACcD2C71f022BCFd0eE";

    this.ether = 1e18; // 1ether
    this.ratio = 1e4; //ratio_factor
    this.sleepTime = 6000;
    this.swapTxDeadLine = 1736000000;
    this.ipDepositTokenAmount = getBigNumber(1000000);
    this.gp1DepositTokenAmount = getBigNumber(1000000);
    this.gp2DepositTokenAmount = getBigNumber(2000000);
    this.lp1DepositTokenAmount = getBigNumber(100000);
    this.lp2DepositTokenAmount = getBigNumber(50000);
    this.sellIPTokenAmount = getBigNumber(500000);
    this.dgtTokenAmount = 0;
    this.impawnRatio = 500000;
    this.closeLine = 1000000;
    this.chargeRatio = 100000;
    this.duration = 360;

    this.signers = await ethers.getSigners();
    this.owner = this.signers[0];
    this.ipAccount1 = this.signers[1];
    this.ipAccount2 = this.signers[2];
    this.gpAccount1 = this.signers[3];
    this.gpAccount2 = this.signers[4];
    this.lpAccount1 = this.signers[5];
    this.lpAccount2 = this.signers[6];

    this.Token1 = await ethers.getContractAt('IERC20', this.token1);
    this.Token2 = await ethers.getContractAt('IERC20', this.token2);
    this.PairToken = await ethers.getContractAt("IUniswapV2Pair", this.pairToken);
    this.DGT = await ethers.getContractAt('IERC20', this.dgt);

    this.Router = await ethers.getContractAt('IUniswapV2Router02', UniswapRouterAddress);
    this.NPSwap = await ethers.getContractAt('NPSwap', NPSwapAddress);
    this.NudgePool = await ethers.getContractAt('NudgePool', NudgePoolAddress);
    this.NudgePoolStatus = await ethers.getContractAt('NudgePoolStatus', NudgePoolStatusAddress);
  })

  it("Change duration", async function() {
    this.auctionDuration = await this.NudgePool.auctionDuration();
    this.raisingDuration = await this.NudgePool.raisingDuration();
    this.minimumDuration = await this.NudgePool.minimumDuration();

    const setDurationTx = await this.NudgePool.setDuration(120, 120, 240);
    await setDurationTx.wait();

    expect(await this.NudgePool.auctionDuration()).to.be.equal(120);
    expect(await this.NudgePool.raisingDuration()).to.be.equal(120);
    expect(await this.NudgePool.minimumDuration()).to.be.equal(240);
  })

  it("Create pool", async function() {
    const stage = await this.NudgePoolStatus.getPoolStage(this.token1, this.token2);
    // Return while not at finish stage
    if (stage != 0) {
      return
    }

    this.ip1BalanceIn = await this.Token1.balanceOf(this.ipAccount1.address);
    const approveTX = await this.Token1.connect(this.ipAccount1).approve(
      this.NudgePool.address,
      this.ipDepositTokenAmount);
    await approveTX.wait();

    const createTX  = await this.NudgePool.connect(this.ipAccount1).createPool(
      this.ipAccount1.address,
      this.token1,
      this.token2,
      this.ipDepositTokenAmount,
      this.dgtTokenAmount,
      this.impawnRatio,
      this.closeLine,
      this.chargeRatio,
      this.duration);
    await createTX.wait();

    // Expect right ip address
    expect(await this.NudgePoolStatus.getIPAddress(
      this.token1, this.token2)).to.be.equal(this.ipAccount1.address);
    // Expect at auction stage
    expect(await this.NudgePoolStatus.getPoolStage(
      this.token1, this.token2)).to.be.equal(2);

    loger("---------- Parameter configuration ----------");
    const IPImpawnRatio = await this.NudgePoolStatus.getIPImpawnRatio(
        this.token1, this.token2);
    loger("IP impawn ratio: " + Math.round(IPImpawnRatio/this.ratio) + "%");
    const IPCloseLine = await this.NudgePoolStatus.getIPCloseLine(
        this.token1, this.token2);
    loger("IP close line: " + Math.round(IPCloseLine/this.ratio) + "%");
    const IPTokenAmount = await this.NudgePoolStatus.getIPTokensAmount(
        this.token1, this.token2);
    loger("IPToken amount: " + Math.round(IPTokenAmount/this.ether));
  })

  it("Check auction end", async function() {
    const stage = await this.NudgePoolStatus.getPoolStage(this.token1, this.token2);
    // Return while not at auction stage
    if (stage != 2) {
      return
    }

    // Wait to transit
    let transit = await this.NudgePoolStatus.getStageTransit(
    this.token1, this.token2);
    while (transit == false) {
      await sleep(this.sleepTime);
      transit = await this.NudgePoolStatus.getStageTransit(
        this.token1, this.token2);
    }

    const checkAuctionEndTx = await this.NudgePool.connect(this.ipAccount2).checkAuctionEnd(
      this.token1,
      this.token2
    );
    await checkAuctionEndTx.wait();

    // Expect at raising stage
    expect(await this.NudgePoolStatus.getPoolStage(
      this.token1, this.token2)).to.be.equal(3);
  })

  it("GP deposit raising", async function() {
    const stage = await this.NudgePoolStatus.getPoolStage(this.token1, this.token2);
    // Return while not at raising stage
    if (stage != 3) {
      return
    }
    
    const approveGPAccount1TX = await this.Token2.connect(this.gpAccount1).approve(
      this.NudgePool.address, this.gp1DepositTokenAmount);
    await approveGPAccount1TX.wait();

    this.gp1BalanceIn = await this.Token2.balanceOf(this.gpAccount1.address);
    loger("GPBalanceIn: " + this.gp1BalanceIn);

    const gpDepositRaisingTX = await this.NudgePool.connect(this.gpAccount1).GPDepositRaising(
      this.token1,
      this.token2,
      this.gp1DepositTokenAmount,
      true
    );
    await gpDepositRaisingTX.wait();

    const maxGPVolume = await this.NudgePoolStatus.getMaxGPVolume(
      this.token1,
      this.token2
  );
    loger("Max GP Volume: " + Math.round(maxGPVolume/this.ether));
    const GP1BaseTokenAmount = await this.NudgePoolStatus.getGPBaseAmount(
        this.token1,
        this.token2,
        this.gpAccount1.address);
    loger("GP1 baeseToken amount: " + Math.round(GP1BaseTokenAmount/this.ether));
  })

  it("LP deposit raising", async function() {
    const stage = await this.NudgePoolStatus.getPoolStage(this.token1, this.token2);
    // Return while not at raising stage
    if (stage != 3) {
      return
    }

    const approveLPAccount1TX = await this.Token2.connect(this.lpAccount1).approve(
      this.NudgePool.address, this.lp1DepositTokenAmount);
    await approveLPAccount1TX.wait();

    this.lp1BalanceIn = await this.Token2.balanceOf(this.lpAccount1.address);
    loger("LP Balance In: " + this.lp1BalanceIn);

    const lpDepositRaisingTX = await this.NudgePool.connect(this.lpAccount1).LPDepositRaising(
      this.token1,
      this.token2,
      this.lp1DepositTokenAmount,
      true
    );
    await lpDepositRaisingTX.wait();
      
    const LP1BaseTokenAmount = await this.NudgePoolStatus.getLPBaseAmount(
        this.token1,
        this.token2,
        this.lpAccount1.address);
    loger("LP1 baseToken amount: " + Math.round(LP1BaseTokenAmount/this.ether));
    expect(LP1BaseTokenAmount).to.be.equal(this.lp1DepositTokenAmount);
  })
  it("Swap Iptoken for baseToken", async function() {
    let [lastToken1Reserve, lastToken2Reserve, ] = await this.PairToken.getReserves();
    loger("lastBaseTokenReserve: " + Math.floor(lastToken1Reserve/this.ether));
    loger("lastIPTokenReserve: " + Math.floor(lastToken2Reserve/this.ether));

    const approveToken1TX = await this.Token1.connect(this.owner).approve(
      this.Router.address, this.sellIPTokenAmount);
    await approveToken1TX.wait();

    const path = new Array();
    path[0] = this.token1;
    path[1] = this.token2;

    const swapIPtokenForBaseTokenTx = await this.Router.swapExactTokensForTokens(
      this.sellIPTokenAmount,
      0,
      path,
      this.owner.address,
      this.swapTxDeadLine
    )
    await swapIPtokenForBaseTokenTx.wait();

    let [curToken1Reserve, curToken2Reserve, ] = await this.PairToken.getReserves();
    loger("curBaseTokenReserve " + Math.floor(curToken1Reserve/this.ether));
    loger("curIPTokenReserve " + Math.floor(curToken2Reserve/this.ether));
  })

  it("Check raising end", async function() {
    const stage = await this.NudgePoolStatus.getPoolStage(this.token1, this.token2);
    // Return while not at Raising stage
    if (stage != 3) {
      return
    }
    const [lastToken1Reserve, lastToken2Reserve, ] = await this.PairToken.getReserves();
    const lastRatio = (lastToken2Reserve/lastToken1Reserve).toFixed(4);
    loger("BaseToken/IPToken price ratio: " + lastRatio);

    // Wait to transit
    let transit = await this.NudgePoolStatus.getStageTransit(
    this.token1, this.token2);
    while (transit == false) {
      await sleep(this.sleepTime);
      transit = await this.NudgePoolStatus.getStageTransit(
        this.token1, this.token2);
    }

    const RaisingEndTx = await this.NudgePool.checkRaisingEnd(
      this.token1,
      this.token2
    );
    await RaisingEndTx.wait();

    const [curToken1Reserve, curToken2Reserve, ] = await this.PairToken.getReserves();
    const curRatio = (curToken2Reserve/curToken1Reserve).toFixed(4);
    loger("BaseToken/IPToken price ratio: " + curRatio);
    const ip1BalanceOut = await this.Token1.balanceOf(this.ipAccount1.address);
    loger("IP IPToken loss: " + Math.round((ip1BalanceOut - this.ip1BalanceIn)/this.ether));
    const gp1BalanceOut = await this.Token2.balanceOf(this.gpAccount1.address);
    loger("GP1 profit: " + Math.round((gp1BalanceOut - this.gp1BalanceIn)/this.ether));
    const lp1BalanceOut = await this.Token2.balanceOf(this.lpAccount1.address);
    loger("LP1 profit: " + Math.round((lp1BalanceOut - this.lp1BalanceIn)/this.ether));

    // Expect at running stage
    expect(await this.NudgePoolStatus.getPoolStage(
      this.token1, this.token2)).to.be.equal(0);
  })

  it("Recover liquidity", async function() {
    const [lastToken1Reserve, lastToken2Reserve, ] = await this.PairToken.getReserves();
    const BaseTokenIn = await this.Router.getAmountIn(
      this.sellIPTokenAmount,
      lastToken1Reserve,
      lastToken2Reserve
    );

    const approveToken1TX = await this.Token1.connect(this.owner).approve(this.Router.address, BaseTokenIn);
    await approveToken1TX.wait();

    const path = new Array();
    path[0] = this.token2;
    path[1] = this.token1;

    const swapBaseTokenForIPTokenTx = await this.Router.swapTokensForExactTokens(
      this.sellIPTokenAmount,
      getBigNumber(10000000), //maxAmountIn
      path,
      this.owner.address,
      this.swapTxDeadLine
    )
    await swapBaseTokenForIPTokenTx.wait();
  })

  it("Recover duration", async function() {
    const reDurationTx = await this.NudgePool.setDuration(this.auctionDuration,
      this.raisingDuration,this.minimumDuration);
    await reDurationTx.wait();

    expect(await this.NudgePool.auctionDuration()).to.be.equal(this.auctionDuration);
    expect(await this.NudgePool.raisingDuration()).to.be.equal(this.raisingDuration);
    expect(await this.NudgePool.minimumDuration()).to.be.equal(this.minimumDuration);
  });
});

import { expect } from "chai";
import { ethers } from "hardhat";
import { logger, Signer } from "ethers";
import { getBigNumber, sleep } from "./utils";
import loger from './utils/fs';
import {CONTRACTS, TOKENS, POOL_CONFIG, SWAP_CONFIG, getDepositConfig} from "../config/stressTest-config";

describe("Stress test", function() {
  before(async function() {
    this.ether = 1e18; // 1ether
    this.ratio = 1e4; //ratio_factor

    const NPSwapAddress = CONTRACTS.NPSwapAddress;
    const NudgePoolAddress = CONTRACTS.NudgePoolAddress;
    const NudgePoolStatusAddress = CONTRACTS.NudgePoolStatusAddress;
    const UniswapRouterAddress = CONTRACTS.UniswapRouterAddress;

    this.token1 = TOKENS.IPToken;
    this.token2 = TOKENS.BaseToken;
    this.dgt = TOKENS.DGT;
    this.pairToken = TOKENS.PairToken;

    this.sleepTime = POOL_CONFIG.sleepTime;
    this.impawnRatio = POOL_CONFIG.impawnRatio;
    this.closeLine = POOL_CONFIG.closeLine;
    this.chargeRatio = POOL_CONFIG.chargeRatio;
    this.duration = POOL_CONFIG.duration; //NudgePool duration

    this.ipDepositTokenAmount = getDepositConfig().ipDepositTokenAmount;
    this.gp1DepositTokenAmount = getDepositConfig().gp1DepositTokenAmount;
    this.gp2DepositTokenAmount = getDepositConfig().gp2DepositTokenAmount;
    this.lp1DepositTokenAmount = getDepositConfig().lp1DepositTokenAmount;
    this.lp2DepositTokenAmount = getDepositConfig().lp2DepositTokenAmount;
    this.dgtTokenAmount = getDepositConfig().dgtTokenAmount;
    this.state = getDepositConfig().state;

    if (this.state != "no liquidation") {
      this.swapTxDeadLine = SWAP_CONFIG.swapTxDeadLine;
      this.sellIPTokenAmount = SWAP_CONFIG.sellIPTokenAmount;
    }

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
    this.DGT = await ethers.getContractAt('IERC20', this.dgt);
    this.PairToken = await ethers.getContractAt("IUniswapV2Pair", this.pairToken);
    this.Router = await ethers.getContractAt('IUniswapV2Router02', UniswapRouterAddress);

    this.NPSwap = await ethers.getContractAt('NPSwap', NPSwapAddress);
    this.NudgePool = await ethers.getContractAt('NudgePool', NudgePoolAddress);
    this.NudgePoolStatus = await ethers.getContractAt('NudgePoolStatus', NudgePoolStatusAddress);
  })

  it("Change duration", async function() {
    this.auctionDuration = await this.NudgePool.auctionDuration();
    this.raisingDuration = await this.NudgePool.raisingDuration();
    this.minimumDuration = await this.NudgePool.minimumDuration();

    const setDurationTx = await this.NudgePool.setDuration(30, 30, 60);
    await setDurationTx.wait();

    expect(await this.NudgePool.auctionDuration()).to.be.equal(30);
    expect(await this.NudgePool.raisingDuration()).to.be.equal(30);
    expect(await this.NudgePool.minimumDuration()).to.be.equal(60);
  })

  it("Create pool", async function() {
    const stage = await this.NudgePoolStatus.getPoolStage(this.token1, this.token2);
    //Return while not at finish stage
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
/*
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
    this.gp1IPBalanceIn = await this.Token1.balanceOf(this.gpAccount1.address);

    const gpDepositRaisingTX = await this.NudgePool.connect(this.gpAccount1).GPDepositRaising(
      this.token1,
      this.token2,
      this.gp1DepositTokenAmount,
      true
    );
    await gpDepositRaisingTX.wait();

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

    const lpDepositRaisingTX = await this.NudgePool.connect(this.lpAccount1).LPDepositRaising(
      this.token1,
      this.token2,
      this.lp1DepositTokenAmount,
      true
    );
    await lpDepositRaisingTX.wait();

    expect(await this.NudgePoolStatus.getCurLPAmount(
      this.token1, this.token2)).to.be.equal(this.lp1DepositTokenAmount);

    const LP1BaseTokenAmount = await this.NudgePoolStatus.getLPBaseAmount(
        this.token1,
        this.token2,
        this.lpAccount1.address);
    loger("LP1 baseToken amount: " + Math.round(LP1BaseTokenAmount/this.ether));
    expect(LP1BaseTokenAmount).to.be.equal(this.lp1DepositTokenAmount);
  })
*/
  it("Check raising end", async function() {
    const stage = await this.NudgePoolStatus.getPoolStage(this.token1, this.token2);
    // Return while not at raising stage
    if (stage != 3) {
      return
    }

    const [lastToken1Reserve, lastToken2Reserve, ] = await this.PairToken.getReserves();
    const lastRatio = (lastToken2Reserve/lastToken1Reserve).toFixed(4);
    loger("Last BaseToken/IPToken price ratio: " + lastRatio);

    if (this.state == "IP raising liquidation") {
      const approveToken1TX = await this.Token1.connect(this.lpAccount2).approve(
        this.Router.address, this.sellIPTokenAmount);
      await approveToken1TX.wait();

      const path = new Array();
      path[0] = this.token1;
      path[1] = this.token2;
  
      const swapIPtokenForBaseTokenTx = await this.Router.swapExactTokensForTokens(
        this.sellIPTokenAmount,
        0,
        path,
        this.lpAccount2.address,
        this.swapTxDeadLine
      )
      await swapIPtokenForBaseTokenTx.wait();
  
      let [curToken1Reserve, curToken2Reserve, ] = await this.PairToken.getReserves();
      let curRatio = (curToken2Reserve/curToken1Reserve).toFixed(4);
      loger("Cur BaseToken/IPToken price ratio: " + curRatio);
    }

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

    if (this.state == "IP raising liquidation") {
      //Expect at liquidation stage
      expect(await this.NudgePoolStatus.getPoolStage(
        this.token1, this.token2)).to.be.equal(6);
    } else {
      // Expect at running stage
      expect(await this.NudgePoolStatus.getPoolStage(
        this.token1, this.token2)).to.be.equal(4);
    }
  })

  it("Allocate fundraising", async function() {
    const stage = await this.NudgePoolStatus.getPoolStage(this.token1, this.token2);
    // Return while not at allocating stage
    if (stage != 4) {
      return
    }

    const allocateFundraisingTx = await this.NudgePool.allocateFundraising(
      this.token1,
      this.token2
    );
    await allocateFundraisingTx.wait();

    const [curToken1Reserve, curToken2Reserve, ] = await this.PairToken.getReserves();
    const curRatio = (curToken2Reserve/curToken1Reserve).toFixed(4);
    loger("Cur BaseToken/IPToken price ratio: " + curRatio);

    // Expect at running stage
    expect(await this.NudgePoolStatus.getPoolStage(
      this.token1, this.token2)).to.be.equal(5);
  })

  it("LP1 withdraw vault", async function() {
    const stage = await this.NudgePoolStatus.getPoolStage(this.token1, this.token2);
    // Return while not at running stage
    if (stage != 5) {
      return
    }
    const computeVaultTX = await this.NudgePool.computeVaultReward(
      this.token1,
      this.token2
    );
    await computeVaultTX.wait();

    const lp1WithdrawVaultTX = await this.NudgePool.connect(this.lpAccount1).LPWithdrawRunning(
      this.token1,
      this.token2,
      0,
      true
    );
    await lp1WithdrawVaultTX.wait();
  })

  it("GP deposit running", async function() {
    const stage = await this.NudgePoolStatus.getPoolStage(this.token1, this.token2);
    // Return while not at running stage
    if (stage != 5) {
      return
    }

    const approveGPAccountTX = await this.Token2.connect(this.gpAccount2).approve(
      this.NudgePool.address, this.gp2DepositTokenAmount);
    await approveGPAccountTX.wait();

    this.gp2BalanceIn = await this.Token2.balanceOf(this.gpAccount2.address);
    this.gp2IPBalanceIn = await this.Token1.balanceOf(this.gpAccount2.address);

    const gpDepositRunningTX = await this.NudgePool.connect(this.gpAccount2).GPDepositRunning(
      this.token1,
      this.token2,
      this.gp2DepositTokenAmount,
      true
    );
    await gpDepositRunningTX.wait();

    const gpDoDepositRunningTX = await this.NudgePool.connect(this.gpAccount2).GPDoDepositRunning(
      this.token1,
      this.token2
    );
    await gpDoDepositRunningTX.wait();

    const maxGPVolume = await this.NudgePoolStatus.getMaxGPVolume(
      this.token1,
      this.token2
  );
    loger("Max GP Volume: " + Math.round(maxGPVolume/this.ether));
    const GP2BaseTokenAmount = await this.NudgePoolStatus.getGPBaseAmount(
        this.token1,
        this.token2,
        this.gpAccount2.address);
    loger("GP2 baseToken amount: " + Math.round(GP2BaseTokenAmount/this.ether));
  });

  it("LP deposit running", async function() {
    const stage = await this.NudgePoolStatus.getPoolStage(this.token1, this.token2);
    // Return while not at running stage
    if (stage != 5) {
      return
    }

    const approveLPAccountTX = await this.Token2.connect(this.lpAccount2).approve(
      this.NudgePool.address, this.lp2DepositTokenAmount);
    await approveLPAccountTX.wait();

    this.lp2BalanceIn = await this.Token2.balanceOf(this.lpAccount2.address);

    const lpDepositRunningTX = await this.NudgePool.connect(this.lpAccount2).LPDepositRunning(
      this.token1,
      this.token2,
      this.lp2DepositTokenAmount,
      true
    );
    await lpDepositRunningTX.wait();

    const lpDoDepositRunningTX = await this.NudgePool.connect(this.lpAccount2).LPDoDepositRunning(
      this.token1,
      this.token2
    );
    await lpDoDepositRunningTX.wait();

    const LP2BaseTokenAmount = await this.NudgePoolStatus.getLPBaseAmount(
        this.token1,
        this.token2,
        this.lpAccount2.address);
    loger("LP2 baseToken amount: " + Math.round(LP2BaseTokenAmount/this.ether));
  });

  it("IP withdraw vault", async function() {
    const stage = await this.NudgePoolStatus.getPoolStage(this.token1, this.token2);
    // Return while not at running stage
    if (stage != 5) {
      return
    }

    let curVault = await this.NudgePoolStatus.getCurVault(
        this.token1,
        this.token2
    );
    curVault = curVault.mul(80).div(100);

    const withDrawVaultTX = await this.NudgePool.connect(this.ipAccount1).withdrawVault(
      this.token1,
      this.token2,
      curVault);
    await withDrawVaultTX.wait();

    loger("----------------- Over View -----------------");
    const IPVault = await this.NudgePoolStatus.getIPWithdrawed(
      this.token1,
      this.token2
    );
    loger("IP vault reward: " + Math.round(IPVault/this.ether));
  })

  it("check IP/GP liquidation", async function() {
    const stage = await this.NudgePoolStatus.getPoolStage(this.token1, this.token2);
    // Return while not at running stage
    if (stage != 5 || this.state == "no liquidation") {
      return
    }

    loger("------------------- Swap -------------------");
    let [lastToken1Reserve, lastToken2Reserve, ] = await this.PairToken.getReserves();
    const lastRatio = (lastToken2Reserve/lastToken1Reserve).toFixed(4);
    loger("BaseToken/IPToken ratio before swap: " + lastRatio);
  
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

    const [curToken1Reserve, curToken2Reserve, ] = await this.PairToken.getReserves();
    const curRatio = (curToken2Reserve/curToken1Reserve).toFixed(4);
    loger("BaseToken/IPToken ratio after swap: " + curRatio);

    if (this.state == "IP running liquidation") {
      const checkIPLiquidationTx = await this.NudgePool.checkIPLiquidation(
        this.token1,
        this.token2
      );
      await checkIPLiquidationTx.wait();
    } else if (this.state == "GP running liquidation") {
      const checkIPLiquidationTx = await this.NudgePool.checkGPLiquidation(
        this.token1,
        this.token2
      );
      await checkIPLiquidationTx.wait();
    }

    //expect at liquidation stage
    expect(await this.NudgePoolStatus.getPoolStage(
      this.token1, this.token2)).to.be.equal(6);
  })

  it("Check running end", async function() {
    const stage = await this.NudgePoolStatus.getPoolStage(this.token1, this.token2);
    // Return while not at running stage
    if (stage != 5 || this.state != "no liquidation") {
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

    const runningEndTx = await this.NudgePool.connect(this.ipAccount2).checkRunningEnd(
      this.token1,
      this.token2
    );
    await runningEndTx.wait();

    // Expect at liquidation stage
    expect(await this.NudgePoolStatus.getPoolStage(
      this.token1, this.token2)).to.be.equal(6);
  })

  it("Destroy Pool", async function() {
    const stage = await this.NudgePoolStatus.getPoolStage(this.token1, this.token2);
    // Return while not at liquidation stage
    if (stage != 6) {
      return
    }

    const destroyTx = await this.NudgePool.destroyPool(
      this.token1,
      this.token2
    );
    await destroyTx.wait();

    // Expect at finished stage
    expect(await this.NudgePoolStatus.getPoolStage(
      this.token1, this.token2)).to.be.equal(0);

    if(this.state == "IP raising liquidation") {
      loger("----------------- Over View -----------------");
    }

    if(this.state == "IP raising liquidation" || this.state == "IP running liquidation") {
      const ip1BalanceOut = await this.Token1.balanceOf(this.ipAccount1.address);
      loger("IP IPToken loss: " + Math.round((ip1BalanceOut - this.ip1BalanceIn)/this.ether));
    }

    const gp1BalanceOut = await this.Token2.balanceOf(this.gpAccount1.address);
    loger("GP1 BaseToken profit: " + Math.round((gp1BalanceOut - this.gp1BalanceIn)/this.ether));
    const lp1BalanceOut = await this.Token2.balanceOf(this.lpAccount1.address);
    loger("LP1 profit: " + Math.round((lp1BalanceOut - this.lp1BalanceIn)/this.ether));

    if(this.state == "no liquidation" || this.state != "GP running liquidation" ) {
      const gp2BalanceOut = await this.Token2.balanceOf(this.gpAccount2.address);
      loger("GP2 profit: " + Math.round((gp2BalanceOut - this.gp2BalanceIn)/this.ether));
      const lp2BalanceOut = await this.Token2.balanceOf(this.lpAccount2.address);
      loger("LP2 profit: " + Math.round((lp2BalanceOut - this.lp2BalanceIn)/this.ether));
    };

    if(this.state == "IP running liquidation") {
      const gp1IPBalanceOut = await this.Token1.balanceOf(this.gpAccount1.address);
      loger("GP1 IPToken profit: " + Math.round((gp1IPBalanceOut - this.gp1IPBalanceIn)/this.ether));
      const gp2IPBalanceOut = await this.Token1.balanceOf(this.gpAccount2.address);
      loger("GP2 IPToken profit: " + Math.round((gp2IPBalanceOut - this.gp2IPBalanceIn)/this.ether));
    }

    if (this.state != "no liquidation") {
      let [lastToken1Reserve, lastToken2Reserve, ] = await this.PairToken.getReserves();
      const BaseTokenIn = await this.Router.getAmountIn(
        this.sellIPTokenAmount,
        lastToken1Reserve,
        lastToken2Reserve
      );
  
      const approveToken1TX = await this.Token1.connect(this.owner).approve(
        this.Router.address, 
        BaseTokenIn);
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

      let [curToken1Reserve, curToken2Reserve, ] = await this.PairToken.getReserves();
      loger("curBaseTokenReserve " + Math.floor(curToken1Reserve/this.ether));
      loger("curIPTokenReserve " + Math.floor(curToken2Reserve/this.ether));
    }
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

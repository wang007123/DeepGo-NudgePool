import { expect } from "chai";
import { ethers } from "hardhat";
import { Signer } from "ethers";
import { getBigNumber, sleep } from "./utils";

describe("NudgePool", function() {
  before(async function() {
    const NPSwapAddress = "0x27839Bb6045a773f0C280C8c8F0D6cdF92415A31";
    const NudgePoolAddress = "0x6d7b5D1bda21a02C756aAcecbfe444dede48e731";
    const NudgePoolStatusAddress = "0xA603Fa2b3A7e79273277F8c2381535B81d5d5AE2";

    this.token1 = "0xD33Dc5D483Ed42bDA6C99506c21114e517eDAFd4";
    this.token2 = "0xB638F4D59F85a6036870fDB8e031831267DF9FC0";
    this.dgt = "0xB6d7Bf947d4D6321FD863ACcD2C71f022BCFd0eE";

    this.signers = await ethers.getSigners();
    this.ipAccount1 = this.signers[1];
    this.ipAccount2 = this.signers[2];
    this.gpAccount1 = this.signers[3];
    this.gpAccount2 = this.signers[4];
    this.lpAccount1 = this.signers[5];
    this.lpAccount2 = this.signers[6];
    console.log("ipAccount1 address: " + this.ipAccount1.address);
    console.log("ipAccount2 address: " + this.ipAccount2.address);
    console.log("gpAccount1 address: " + this.gpAccount1.address);
    console.log("gpAccount2 address: " + this.gpAccount2.address);
    console.log("lpAccount1 address: " + this.lpAccount1.address);
    console.log("lpAccount2 address: " + this.lpAccount2.address);

    this.Token1 = await ethers.getContractAt('IERC20', this.token1);
    console.log("token1 address: " + this.Token1.address);
    this.Token2 = await ethers.getContractAt('IERC20', this.token2);
    console.log("token2 address: " + this.Token2.address);
    this.DGT = await ethers.getContractAt('IERC20', this.dgt);
    console.log("DGT address: " + this.DGT.address);

    this.NPSwap = await ethers.getContractAt('NPSwap', NPSwapAddress);
    console.log("NPSwap address: " + this.NPSwap.address);
    this.NudgePool = await ethers.getContractAt('NudgePool', NudgePoolAddress);
    console.log("NudgePool address: " + this.NudgePool.address);
    this.NudgePoolStatus = await ethers.getContractAt('NudgePoolStatus', NudgePoolStatusAddress);
    console.log("NudgePoolStatus address: " + this.NudgePoolStatus.address);
  })

  it("Change duration", async function() {
    this.auctionDuration = await this.NudgePool.auctionDuration();
    console.log("auctionDuration: " + this.auctionDuration);
    this.raisingDuration = await this.NudgePool.raisingDuration();
    console.log("raisingDuration: " + this.raisingDuration);
    this.minimumDuration = await this.NudgePool.minimumDuration();
    console.log("minimumDuration: " + this.minimumDuration);

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

    const approveTX = await this.Token1.connect(this.ipAccount1).approve(this.NudgePool.address, getBigNumber(100000));
    await approveTX.wait();

    const createTX  = await this.NudgePool.connect(this.ipAccount1).createPool(
      this.ipAccount1.address,
      this.token1,
      this.token2,
      getBigNumber(100000),
      0,
      800000,
      1200000,
      100000,
      600);
    await createTX.wait();

    // Expect right ip address
    expect(await this.NudgePoolStatus.getIPAddress(
      this.token1, this.token2)).to.be.equal(this.ipAccount1.address);
    // Expect at auction stage
    expect(await this.NudgePoolStatus.getPoolStage(
      this.token1, this.token2)).to.be.equal(2);
  })

  it("Auction pool", async function() {
    const stage = await this.NudgePoolStatus.getPoolStage(this.token1, this.token2);
    // Return while not at auction stage
    if (stage != 2) {
      return
    }

    const approveToken2TX = await this.Token1.connect(this.ipAccount2).approve(
      this.NudgePool.address, getBigNumber(100000));
    const approveDGT = await this.DGT.connect(this.ipAccount2).approve(
      this.NudgePool.address, getBigNumber(30));

    await approveToken2TX.wait();
    await approveDGT.wait();

    const auctionTx = await this.NudgePool.connect(this.ipAccount2).auctionPool(
      this.ipAccount2.address,
      this.token1,
      this.token2,
      getBigNumber(100000),
      getBigNumber(30)
    );
    await auctionTx.wait();

    // Expect right ip address
    expect(await this.NudgePoolStatus.getIPAddress(
      this.token1, this.token2)).to.be.equal(this.ipAccount2.address);
    // Expect right ip token amount
    expect(await this.NudgePoolStatus.getIPTokensAmount(
      this.token1, this.token2)).to.be.equal(getBigNumber(100000));
  })

  it ("Change pool param", async function(){
    const stage = await this.NudgePoolStatus.getPoolStage(this.token1, this.token2);
    // Return while not at auction stage
    if (stage != 2) {
      return
    }

    const changePoolParamTX = await this.NudgePool.connect(this.ipAccount2).changePoolParam(
      this.token1,
      this.token2,
      800000,
      1200000,
      100000,
      600
    );
    await changePoolParamTX.wait();

    expect(await this.NudgePoolStatus.getIPTokensAmount(
      this.token1, this.token2)).to.be.equal(getBigNumber(100000));
    expect(await this.NudgePoolStatus.getIPImpawnRatio(
      this.token1, this.token2)).to.be.equal(800000);
    expect(await this.NudgePoolStatus.getIPCloseLine(
      this.token1, this.token2)).to.be.equal(1200000);
    expect(await this.NudgePoolStatus.getIPDuration(
      this.token1, this.token2)).to.be.equal(600);
    expect(await this.NudgePoolStatus.getIPDGTAmount(
      this.token1, this.token2)).to.be.equal(getBigNumber(30));
  })

  it("Check auction end", async function() {
    const stage = await this.NudgePoolStatus.getPoolStage(this.token1, this.token2);
    // Return while not at auction stage
    if (stage != 2) {
      return
    }

    // Wait to transit
    console.log("At auction stage and wait for raising stage");
    let transit = await this.NudgePoolStatus.getStageTransit(
    this.token1, this.token2);
    while (transit == false) {
      await sleep(60000);
      transit = await this.NudgePoolStatus.getStageTransit(
        this.token1, this.token2);
    }
    console.log("Transit to raising stage");

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
      this.NudgePool.address, getBigNumber(30));
    await approveGPAccount1TX.wait();

    const gpDepositRaisingTX = await this.NudgePool.connect(this.gpAccount1).GPDepositRaising(
      this.token1,
      this.token2,
      getBigNumber(30),
      true
    );
    await gpDepositRaisingTX.wait();

    expect(await this.NudgePoolStatus.getCurGPAmount(
      this.token1, this.token2)).to.be.equal(getBigNumber(30));
    expect(await this.NudgePoolStatus.getGPBaseAmount(
      this.token1,
      this.token2,
      this.gpAccount1.address)).to.be.equal(getBigNumber(30));
  })

  it("GP additionally deposit raising", async function() {
    const stage = await this.NudgePoolStatus.getPoolStage(this.token1, this.token2);
    // Return while not at raising stage
    if (stage != 3) {
      return
    }

    const approveGPAccount1TX = await this.Token2.connect(this.gpAccount1).approve(
      this.NudgePool.address, getBigNumber(20));
    await approveGPAccount1TX.wait();

    const gpDepositRaising = await this.NudgePool.connect(this.gpAccount1).GPDepositRaising(
      this.token1,
      this.token2,
      getBigNumber(20),
      false
    );
    await gpDepositRaising.wait();

    expect(await this.NudgePoolStatus.getCurGPAmount(
      this.token1, this.token2)).to.be.equal(getBigNumber(50));
    expect(await this.NudgePoolStatus.getGPBaseAmount(
      this.token1,
      this.token2,
      this.gpAccount1.address)).to.be.equal(getBigNumber(50))
  })

  it("LP deposit raising", async function() {
    const stage = await this.NudgePoolStatus.getPoolStage(this.token1, this.token2);
    // Return while not at raising stage
    if (stage != 3) {
      return
    }

    const approveLPAccount1TX = await this.Token2.connect(this.lpAccount1).approve(
      this.NudgePool.address, getBigNumber(30));
    await approveLPAccount1TX.wait();

    const lpDepositRaisingTX = await this.NudgePool.connect(this.lpAccount1).LPDepositRaising(
      this.token1,
      this.token2,
      getBigNumber(30),
      true
    );
    await lpDepositRaisingTX.wait();

    expect(await this.NudgePoolStatus.getCurLPAmount(
      this.token1, this.token2)).to.be.equal(getBigNumber(30));
    expect(await this.NudgePoolStatus.getLPBaseAmount(
      this.token1,
      this.token2,
      this.lpAccount1.address)).to.be.equal(getBigNumber(30))
  })

  it("LP additionally deposit raising", async function() {
    const stage = await this.NudgePoolStatus.getPoolStage(this.token1, this.token2);
    // Return while not at raising stage
    if (stage != 3) {
      return
    }

    const approveLPAccountTX = await this.Token2.connect(this.lpAccount1).approve(
      this.NudgePool.address, getBigNumber(20));
    await approveLPAccountTX.wait();

    const lpDepositRaisingTX = await this.NudgePool.connect(this.lpAccount1).LPDepositRaising(
      this.token1,
      this.token2,
      getBigNumber(20),
      false
    );
    await lpDepositRaisingTX.wait();

    expect(await this.NudgePoolStatus.getCurLPAmount(
      this.token1, this.token2)).to.be.equal(getBigNumber(50));
    expect(await this.NudgePoolStatus.getLPBaseAmount(
      this.token1,
      this.token2,
      this.lpAccount1.address)).to.be.equal(getBigNumber(50))
  })

  it("Check raising end", async function() {
    const stage = await this.NudgePoolStatus.getPoolStage(this.token1, this.token2);
    // Return while not at Raising stage
    if (stage != 3) {
      return
    }

    // Wait to transit
    console.log("At raising stage and wait for running stage");
    let transit = await this.NudgePoolStatus.getStageTransit(
    this.token1, this.token2);
    while (transit == false) {
      await sleep(60000);
      transit = await this.NudgePoolStatus.getStageTransit(
        this.token1, this.token2);
    }
    console.log("Transit to running stage");

    const RaisingEndTx = await this.NudgePool.connect(this.ipAccount2).checkRaisingEnd(
      this.token1,
      this.token2
    );
    await RaisingEndTx.wait();

    // Expect at running stage
    expect(await this.NudgePoolStatus.getPoolStage(
      this.token1, this.token2)).to.be.equal(4);
  })

  it("IP deposit running", async function() {
    const stage = await this.NudgePoolStatus.getPoolStage(this.token1, this.token2);
    if (stage != 3 && stage != 4) {
      return
    }

    const approveIPAccount2TX = await this.Token1.connect(this.ipAccount2).approve(
      this.NudgePool.address, getBigNumber(200000));
    await approveIPAccount2TX.wait();

    const ipDepositRunningTX = await this.NudgePool.connect(this.ipAccount2).IPDepositRunning(
      this.token1,
      this.token2,
      getBigNumber(200000),
    );
    await ipDepositRunningTX.wait();
  
    expect(await this.NudgePoolStatus.getIPTokensAmount(
      this.token1, this.token2)).to.be.equal(getBigNumber(300000));
  })

  it("GP deposit running", async function() {
    const stage = await this.NudgePoolStatus.getPoolStage(this.token1, this.token2);
    // Return while not at running stage
    if (stage != 4) {
      return
    }

    const approveGPAccountTX = await this.Token2.connect(this.gpAccount2).approve(
      this.NudgePool.address, getBigNumber(30));
    await approveGPAccountTX.wait();

    const gpDepositRunningTX = await this.NudgePool.connect(this.gpAccount2).GPDepositRunning(
      this.token1,
      this.token2,
      getBigNumber(30),
      true
    );
    await gpDepositRunningTX.wait();

    const gpDoDepositRunningTX = await this.NudgePool.connect(this.gpAccount2).GPDoDepositRunning(
      this.token1,
      this.token2
    );
    await gpDoDepositRunningTX.wait();

    expect(await this.NudgePoolStatus.getCurGPAmount(
      this.token1, this.token2)).to.be.equal(getBigNumber(80));
    expect(await this.NudgePoolStatus.getGPBaseAmount(
      this.token1,
      this.token2,
      this.gpAccount2.address)).to.be.equal(getBigNumber(30))
  });

  it("GP additionally deposit running", async function() {
    const stage = await this.NudgePoolStatus.getPoolStage(this.token1, this.token2);
    // Return while not at running stage
    if (stage != 4) {
      return
    }

    const approveGPAccount2TX = await this.Token2.connect(this.gpAccount2).approve(
      this.NudgePool.address, getBigNumber(10));
    await approveGPAccount2TX.wait();

    const gpDepositRunningTX = await this.NudgePool.connect(this.gpAccount2).GPDepositRunning(
      this.token1,
      this.token2,
      getBigNumber(10),
      false
    );
    await gpDepositRunningTX.wait();

    const gpDoDepositRunningTX = await this.NudgePool.connect(this.gpAccount2).GPDoDepositRunning(
      this.token1,
      this.token2
    );
    await gpDoDepositRunningTX.wait();

    expect(await this.NudgePoolStatus.getCurGPAmount(
      this.token1, this.token2)).to.be.equal(getBigNumber(90));
    expect(await this.NudgePoolStatus.getGPBaseAmount(
      this.token1,
      this.token2,
      this.gpAccount2.address)).to.be.equal(getBigNumber(40));
  })

  it("LP deposit running", async function() {
    const stage = await this.NudgePoolStatus.getPoolStage(this.token1, this.token2);
    // Return while not at running stage
    if (stage != 4) {
      return
    }

    const approveLPAccount2TX = await this.Token2.connect(this.lpAccount2).approve(
      this.NudgePool.address, getBigNumber(30));
    await approveLPAccount2TX.wait();

    const lpDepositRunningTX = await this.NudgePool.connect(this.lpAccount2).LPDepositRunning(
      this.token1,
      this.token2,
      getBigNumber(30),
      true
    );
    await lpDepositRunningTX.wait();

    const lpDoDepositRunningTX = await this.NudgePool.connect(this.lpAccount2).LPDoDepositRunning(
      this.token1,
      this.token2
    );
    await lpDoDepositRunningTX.wait();

    expect(await this.NudgePoolStatus.getCurLPAmount(
      this.token1, this.token2)).to.be.equal(getBigNumber(80));
    expect(await this.NudgePoolStatus.getLPBaseAmount(
      this.token1,
      this.token2,
      this.lpAccount2.address)).to.be.equal(getBigNumber(30));

  })

  it("LP additionally deposit running", async function() {
    const stage = await this.NudgePoolStatus.getPoolStage(this.token1, this.token2);
    // Return while not at running stage
    if (stage != 4) {
      return
    }

    const approveLPAccountTX = await this.Token2.connect(this.lpAccount2).approve(
      this.NudgePool.address, getBigNumber(20));
    await approveLPAccountTX.wait();

    const lpDepositRunningTX = await this.NudgePool.connect(this.lpAccount2).LPDepositRunning(
      this.token1,
      this.token2,
      getBigNumber(20),
      false
    );
    await lpDepositRunningTX.wait();

    const lpDoDepositRunningTX = await this.NudgePool.connect(this.lpAccount2).LPDoDepositRunning(
      this.token1,
      this.token2
    );
    await lpDoDepositRunningTX.wait();

    expect(await this.NudgePoolStatus.getCurLPAmount(
      this.token1, this.token2)).to.be.equal(getBigNumber(100));
    expect(await this.NudgePoolStatus.getLPBaseAmount(
      this.token1,
      this.token2,
      this.lpAccount2.address)).to.be.equal(getBigNumber(50));
  })

  it("LP withdraw vault", async function() {
    const stage = await this.NudgePoolStatus.getPoolStage(this.token1, this.token2);
    // Return while not at running stage
    if (stage != 4) {
      return
    }
    const computeVaultTX = await this.NudgePool.computeVaultReward(
      this.token1,
      this.token2
    );
    await computeVaultTX.wait();

    const lpWithdrawVaultTX = await this.NudgePool.connect(this.lpAccount2).LPWithdrawRunning(
      this.token1,
      this.token2,
      0,
      true
    );
    await lpWithdrawVaultTX.wait();

    expect(await this.NudgePoolStatus.getLPReward(
      this.token1,
      this.token2,
      this.lpAccount2.address)).to.be.equal(0);
  })

  it("GP1 withdraw running", async function() {
    const stage = await this.NudgePoolStatus.getPoolStage(this.token1, this.token2);
    // Return while not at running stage
    if (stage != 4) {
      return
    }

    const gpWithdrawRunning1TX = await this.NudgePool.connect(this.gpAccount1).GPWithdrawRunning(
      this.token1,
      this.token2,
      getBigNumber(10)
    );
    await gpWithdrawRunning1TX.wait();

    expect(await this.NudgePoolStatus.getCurGPAmount(
      this.token1, this.token2)).to.be.equal(getBigNumber(40));
  })

  it("GP2 withdraw running", async function() {
    const stage = await this.NudgePoolStatus.getPoolStage(this.token1, this.token2);
    // Return while not at running stage
    if (stage != 4) {
      return
    }

    const gpWithdrawRunning2TX = await this.NudgePool.connect(this.gpAccount2).GPWithdrawRunning(
      this.token1,
      this.token2,
      getBigNumber(10)
    );
    await gpWithdrawRunning2TX.wait();

    expect(await this.NudgePoolStatus.getCurGPAmount(
      this.token1, this.token2)).to.be.equal(0);
  })

  it("LP1 withdraw running", async function() {
    const stage = await this.NudgePoolStatus.getPoolStage(this.token1, this.token2);
    // Return while not at running stage
    if (stage != 4) {
      return
    }

    const lpWithdrawRunning1TX = await this.NudgePool.connect(this.lpAccount1).LPWithdrawRunning(
      this.token1,
      this.token2,
      getBigNumber(10),
      false
    );
    await lpWithdrawRunning1TX.wait();

    expect(await this.NudgePoolStatus.getCurLPAmount(
      this.token1, this.token2)).to.be.equal(getBigNumber(50));
  })

  it("LP2 withdraw running", async function() {
    const stage = await this.NudgePoolStatus.getPoolStage(this.token1, this.token2);
    // Return while not at running stage
    if (stage != 4) {
      return
    }

    const lpWithdrawRunning2TX = await this.NudgePool.connect(this.lpAccount2).LPWithdrawRunning(
      this.token1,
      this.token2,
      getBigNumber(10),
      false
    );
    await lpWithdrawRunning2TX.wait();

    expect(await this.NudgePoolStatus.getCurLPAmount(
      this.token1, this.token2)).to.be.equal(0);
  })

  it("IP withdraw vault", async function() {
    const stage = await this.NudgePoolStatus.getPoolStage(this.token1, this.token2);
    // Return while not at running stage
    if (stage != 4) {
      return
    }

    const withDrawVaultTX = await this.NudgePool.connect(this.ipAccount2).withdrawVault(
      this.token1,
      this.token2,
      getBigNumber(2));

    await withDrawVaultTX.wait();

    expect(await this.NudgePoolStatus.getIPWithdrawed(
      this.token1,
      this.token2
    )).to.be.equal(getBigNumber(2));
  })

  it("Check running end", async function() {
    const stage = await this.NudgePoolStatus.getPoolStage(this.token1, this.token2);
    // Return while not at running stage
    if (stage != 4) {
      return
    }

    // Wait to transit
    console.log("At running stage and wait for finished stage");
    let transit = await this.NudgePoolStatus.getStageTransit(
    this.token1, this.token2);
    while (transit == false) {
      await sleep(60000);
      transit = await this.NudgePoolStatus.getStageTransit(
        this.token1, this.token2);
    }
    console.log("Transit to finished stage");

    const runningEndTx = await this.NudgePool.connect(this.ipAccount2).checkRunningEnd(
      this.token1,
      this.token2
    );
    await runningEndTx.wait();

    // Expect at finished stage
    expect(await this.NudgePoolStatus.getPoolStage(
      this.token1, this.token2)).to.be.equal(0);
  })

  it("Recover Duration", async function() {
    const reDurationTx = await this.NudgePool.setDuration(this.auctionDuration,
      this.raisingDuration,this.minimumDuration);
    await reDurationTx.wait();

    expect(await this.NudgePool.auctionDuration()).to.be.equal(this.auctionDuration);
    expect(await this.NudgePool.raisingDuration()).to.be.equal(this.raisingDuration);
    expect(await this.NudgePool.minimumDuration()).to.be.equal(this.minimumDuration);
  });
});

import "@nomiclabs/hardhat-ethers"

import { task } from "hardhat/config";

const { RINKEBY_CONFIG } = require("../config/rinkeby-config");

task("rollback", "Rollback the delayed upgrade").setAction(async (_, { ethers }) => {
    const NudgePoolAddress = RINKEBY_CONFIG.NudgePool;
    const NudgePool = await ethers.getContractAt('NudgePool', NudgePoolAddress);
    await NudgePool.rollback().then(() => {
      console.log("Rollback finished");
    });
});

task("pause", "Pasue all the external NudgePool functions").setAction(async (_, { ethers }) => {
    const NudgePoolAddress = RINKEBY_CONFIG.NudgePool;
    const NudgePool = await ethers.getContractAt('NudgePool', NudgePoolAddress);
    await NudgePool.setPause().then(() => {
      console.log("NudgePool successful paused");
    });
});

task("unpause", "Unpasue all the external NudgePool functions").setAction(async (_, { ethers }) => {
    const NudgePoolAddress = RINKEBY_CONFIG.NudgePool;
    const NudgePool = await ethers.getContractAt('NudgePool', NudgePoolAddress);
    await NudgePool.unPause().then(() => {
        console.log("NudgePool successful unpaused");
    });
});

task("set-upgrade", "Set up a new upgrade for logic contract address").setAction(async (_, { ethers }) => {
    const NudgePoolAddress = RINKEBY_CONFIG.NudgePool;
    const NudgePool = await ethers.getContractAt('NudgePool', NudgePoolAddress);
    await NudgePool.setUpgrade(
        RINKEBY_CONFIG.newVersion,
        RINKEBY_CONFIG.newIPLogic,
        RINKEBY_CONFIG.newGPDepositLogic,
        RINKEBY_CONFIG.newGPWithdrawLogic,
        RINKEBY_CONFIG.newLPLogic,
        RINKEBY_CONFIG.newVaultLogic,
        RINKEBY_CONFIG.newStateLogic,
        RINKEBY_CONFIG.newLiquidationLogic
    ).then(() => {
        console.log("Successful set up a new upgrade");
    });
});

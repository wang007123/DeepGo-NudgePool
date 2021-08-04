require("@nomiclabs/hardhat-waffle");

const { GetConfig } = require("../config/auto-config.js")

task("rollback", "Rollback the delayed upgrade")
    .setAction(async (_, { ethers, getChainId}) => {
        const ID = await getChainId();
        const NudgePoolAddress =  await GetConfig(ID).NudgePool;
        const NudgePool = await ethers.getContractAt('NudgePool', NudgePoolAddress);
        await NudgePool.rollback().then(() => {
            console.log("Rollback finished");
        });
});

task("pause", "Pasue all the external NudgePool functions")
    .setAction(async (_, { ethers, getChainId}) => {
        const ID = await getChainId();
        const NudgePoolAddress =  await GetConfig(ID).NudgePool;
        const NudgePool = await ethers.getContractAt('NudgePool', NudgePoolAddress);
        await NudgePool.setPause().then(() => {
            console.log("NudgePool successful paused");
        });
});

task("unpause", "Unpasue all the external NudgePool functions")
    .setAction(async (_, { ethers, getChainId}) => {
        const ID = await getChainId();
        const NudgePoolAddress =  await GetConfig(ID).NudgePool;
        const NudgePool = await ethers.getContractAt('NudgePool', NudgePoolAddress);
        await NudgePool.unPause().then(() => {
            console.log("NudgePool successful unpaused");
        });
});

task("set-upgrade", "Set up a new upgrade for logic contract address")
    .setAction(async (_, { ethers, getChainId}) => {
        const ID = await getChainId();
        const CONFIG = await GetConfig(ID);
        const NudgePoolAddress =  CONFIG.NudgePool;
        const NudgePool = await ethers.getContractAt('NudgePool', NudgePoolAddress);
        await NudgePool.setUpgrade(
            CONFIG.newVersion,
            CONFIG.newIPLogic,
            CONFIG.newGPDepositLogic,
            CONFIG.newGPWithdrawLogic,
            CONFIG.newLPLogic,
            CONFIG.newVaultLogic,
            CONFIG.newStateLogic,
            CONFIG.newLiquidationLogic
        ).then(() => {
            console.log("Successful set up a new upgrade");
        });
});

task("execute-upgrade", "Execute the delayed upgrade")
    .setAction(async (_, { ethers, getChainId}) => {
        const ID = await getChainId();
        const NudgePoolAddress =  await GetConfig(ID).NudgePool;
        const NudgePool = await ethers.getContractAt('NudgePool', NudgePoolAddress);
        await NudgePool.executeUpgrade().then(() => {
            console.log("Upgrade successful executed");
        });
});

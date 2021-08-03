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


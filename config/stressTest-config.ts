import { getBigNumber } from "../test/utils";

export const CONTRACTS = {
    NPSwapAddress: "0x8a678Ab36147323CC5d4be19Ee10958e187D788b",
    NudgePoolAddress : "0xeF797fF527F94E0b02f3796785F81bc8595Ba427",
    NudgePoolStatusAddress : "0xb2A3Ce1a06CB3AE389c2507A3f30D34154751aF1",
    UniswapRouterAddress : "0x7a250d5630B4cF539739dF2C5dAcb4c659F2488D"
}

export const TOKENS = {
    IPToken: "0xe09D4de9f1dCC8A4d5fB19c30Fb53830F8e2a047",   //TT1
    BaseToken: "0xDA2E05B28c42995D0FE8235861Da5124C1CE81Dd", //DAI
    PairToken: "0xBa1DAcD5f9E909A01B1c8d22429C8ADa9a372F89",
    DGT: "0xB6d7Bf947d4D6321FD863ACcD2C71f022BCFd0eE"
}

export const POOL_CONFIG = {
    sleepTime: 6000,
    impawnRatio: 500000, //50%
    closeLine: 1000000, //100%
    chargeRatio: 100000, //10%
    duration: 240       //Pool duration
}

export const SWAP_CONFIG = {
    swapTxDeadLine: 2136000000,
    sellIPTokenAmount: getBigNumber(5000000)
}

export function getDepositConfig() {
    return DEPOSIT_CONFIG_1;
}

//Over raise, full lever
const DEPOSIT_CONFIG_1 = {
    ipDepositTokenAmount: getBigNumber(50000),
    gp1DepositTokenAmount: getBigNumber(100000),
    gp2DepositTokenAmount: getBigNumber(200000),
    lp1DepositTokenAmount: getBigNumber(20000),
    lp2DepositTokenAmount: getBigNumber(100000),
    dgtTokenAmount: 0,
    state: "no liquidation"
}

//GP running liquidation
const DEPOSIT_CONFIG_2 = {
    ipDepositTokenAmount: getBigNumber(50000),
    gp1DepositTokenAmount: getBigNumber(1000),
    gp2DepositTokenAmount: getBigNumber(5000),
    lp1DepositTokenAmount: getBigNumber(1000),
    lp2DepositTokenAmount: getBigNumber(5000),
    dgtTokenAmount: 0,
    state: "GP running liquidation"
}

//IP raising liquidation
const DEPOSIT_CONFIG_3 = {
    ipDepositTokenAmount: getBigNumber(50000),
    gp1DepositTokenAmount: getBigNumber(20000),
    gp2DepositTokenAmount: getBigNumber(50000),
    lp1DepositTokenAmount: getBigNumber(2000),
    lp2DepositTokenAmount: getBigNumber(5000),
    dgtTokenAmount: 0,
    state: "IP raising liquidation"
}

//IP running liquidation
const DEPOSIT_CONFIG_4 = {
    ipDepositTokenAmount: getBigNumber(50000),
    gp1DepositTokenAmount: getBigNumber(20000),
    gp2DepositTokenAmount: getBigNumber(50000),
    lp1DepositTokenAmount: getBigNumber(2000),
    lp2DepositTokenAmount: getBigNumber(5000),
    dgtTokenAmount: 0,
    state: "IP running liquidation"
}
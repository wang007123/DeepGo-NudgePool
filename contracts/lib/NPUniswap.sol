// SPDX-License-Identifier: MIT

pragma solidity ^0.8.0;

import '@uniswap/v2-core/contracts/interfaces/IUniswapV2Pair.sol';
import '@uniswap/v2-periphery/contracts/interfaces/IUniswapV2Router02.sol';
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";

library NPUniswap {
     using SafeERC20 for IERC20;

    function getAmountOut(
        address factory,
        address router,
        address inToken,
        address outToken,
        uint256 inAmount
    )
        public view
        returns (uint256 outAmount)
    {
        (uint256 reserveIn, uint256 reserveOut) = getReserves(factory, inToken, outToken);
        outAmount = IUniswapV2Router02(router).getAmountOut(inAmount, reserveIn, reserveOut);
    }

    function getAmountIn(
        address factory,
        address router,
        address inToken,
        address outToken,
        uint256 outAmount
    )
        public view
        returns (uint256 inAmount)
    {
        (uint256 reserveIn, uint256 reserveOut) = getReserves(factory, inToken, outToken);
        inAmount = IUniswapV2Router02(router).getAmountIn(outAmount, reserveIn, reserveOut);
    }

    function swap(
        address factory,
        address router,
        address inToken,
        address outToken,
        uint256 inAmount
    )
        public
        returns (uint256 outAmount)
    {
        IERC20(inToken).safeApprove(router, inAmount);

        address[] memory path = new address[](2);
        path[0] = inToken;
        path[1] = outToken;

        uint[] memory amounts = IUniswapV2Router02(router).swapExactTokensForTokens(
            inAmount, 0, path, address(this), block.timestamp + 10 minutes);
        outAmount = amounts[1];
    }

    function sortTokens(
        address tokenA,
        address tokenB
    )
        internal pure
        returns (address token0, address token1)
    {
        require(tokenA != tokenB, 'NPUniswap: IDENTICAL_ADDRESSES');
        (token0, token1) = tokenA < tokenB ? (tokenA, tokenB) : (tokenB, tokenA);
        require(token0 != address(0), 'NPUniswap: ZERO_ADDRESS');
    }

    function pairFor(
        address factory,
        address tokenA,
        address tokenB
    )
        internal pure
        returns (address pair)
    {
        (address token0, address token1) = sortTokens(tokenA, tokenB);
        pair = address(uint160(uint256(keccak256(abi.encodePacked(
                hex'ff',
                factory,
                keccak256(abi.encodePacked(token0, token1)),
                hex'96e8ac4277198ff8b6f785478aa9a39f403cb768dd02cbee326c3e7da348845f' // init code hash
            )))));
    }

    function getReserves(
        address factory,
        address tokenA,
        address tokenB
    )
        internal view
        returns (uint reserveA, uint reserveB)
    {
        (address token0,) = sortTokens(tokenA, tokenB);
        (uint reserve0, uint reserve1,) = IUniswapV2Pair(
                        pairFor(factory, tokenA, tokenB)).getReserves();
        (reserveA, reserveB) = tokenA == token0 ? (reserve0, reserve1) :
                        (reserve1, reserve0);
    }


}
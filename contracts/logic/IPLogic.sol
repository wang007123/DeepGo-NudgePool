// SPDX-License-Identifier: MIT

pragma solidity ^0.8.0;

import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "../lib/SafeMath.sol";
import "./BaseLogic.sol";

contract IPLogic is BaseLogic {
    using SafeMath for uint256;
    using SafeERC20 for IERC20;

    function createPool(
        address _ip,
        address _ipToken,
        address _baseToken,
        uint256 _ipTokensAmount,
        uint256 _dgtTokensAmount,
        uint32 _ipImpawnRatio,
        uint32 _ipCloseLine,
        uint32 _chargeRatio,
        uint256 _duration
    )
        external
        poolNotExist(_ipToken, _baseToken)
    {

        qualifiedIP(_ip, _ipToken, _baseToken, _ipTokensAmount, _dgtTokensAmount, true);
        checkIPParams(_ipImpawnRatio, _ipCloseLine, _chargeRatio, _duration);

        IERC20(_ipToken).safeTransferFrom(_ip, address(this), _ipTokensAmount);
        IERC20(DGTToken).safeTransferFrom(_ip, address(this), _dgtTokensAmount);

        _IPS.insertPool(_ipToken, _baseToken);
        _IPS.setPoolStage(_ipToken, _baseToken, uint8(Stages.CREATING));
        _IPS.setPoolAuctionEndTime(_ipToken, _baseToken, block.timestamp.add(auctionDuration));

        _IPS.setIPAddress(_ipToken, _baseToken, _ip);
        _IPS.setIPTokensAmount(_ipToken, _baseToken, _ipTokensAmount);
        _IPS.setDGTTokensAmount(_ipToken, _baseToken, _dgtTokensAmount);
        _IPS.setIPImpawnRatio(_ipToken, _baseToken, _ipImpawnRatio);
        _IPS.setIPCloseLine(_ipToken, _baseToken, _ipCloseLine);
        _IPS.setIPChargeRatio(_ipToken, _baseToken, _chargeRatio);
        _IPS.setIPDuration(_ipToken, _baseToken, _duration);

        poolTransitNextStage(_ipToken, _baseToken);
    }

    function auctionPool(
        address _ip,
        address _ipToken,
        address _baseToken,
        uint256 _ipTokensAmount,
        uint256 _dgtTokensAmount
    )
        external
        lockPool(_ipToken, _baseToken)
    {
        poolAtStage(_ipToken, _baseToken, Stages.AUCTING);
        qualifiedIP(_ip, _ipToken, _baseToken, _ipTokensAmount, _dgtTokensAmount, false);

        IERC20(_ipToken).safeTransferFrom(_ip, address(this), _ipTokensAmount);
        IERC20(DGTToken).safeTransferFrom(_ip, address(this), _dgtTokensAmount);
        address oriIP = _IPS.getIPAddress(_ipToken, _baseToken);
        IERC20(_ipToken).safeTransfer(oriIP, _IPS.getIPTokensAmount(_ipToken, _baseToken));
        IERC20(DGTToken).safeTransfer(oriIP, _IPS.getDGTTokensAmount(_ipToken, _baseToken));

        _IPS.setIPAddress(_ipToken, _baseToken, _ip);
        _IPS.setIPTokensAmount(_ipToken, _baseToken, _ipTokensAmount);
        _IPS.setDGTTokensAmount(_ipToken, _baseToken, _dgtTokensAmount);
        
        if (block.timestamp > _IPS.getPoolAuctionEndTime(_ipToken, _baseToken).sub(30 minutes) &&
            block.timestamp < _IPS.getPoolAuctionEndTime(_ipToken, _baseToken)) {
            _IPS.setPoolAuctionEndTime(_ipToken, _baseToken, block.timestamp.add(30 minutes));
        }
    }

    function changePoolParam(
        address _ipToken,
        address _baseToken,
        uint32 _ipImpawnRatio,
        uint32 _ipCloseLine,
        uint32 _chargeRatio,
        uint256 _duration
    )
        external
        lockPool(_ipToken, _baseToken)
    {
        address ip = _IPS.getIPAddress(_ipToken, _baseToken);
        require(msg.sender == ip, "Not Permit");
        poolAtStage(_ipToken, _baseToken, Stages.AUCTING);

        checkIPParams(_ipImpawnRatio, _ipCloseLine, _chargeRatio, _duration);
        _IPS.setIPImpawnRatio(_ipToken, _baseToken, _ipImpawnRatio);
        _IPS.setIPCloseLine(_ipToken, _baseToken, _ipCloseLine);
        _IPS.setIPChargeRatio(_ipToken, _baseToken, _chargeRatio);
        _IPS.setIPDuration(_ipToken, _baseToken, _duration);
    }

    function IPDepositRunning(
        address _ipToken,
        address _baseToken,
        uint256 _ipTokensAmount
    )
        external
        lockPool(_ipToken, _baseToken)
        returns (uint256 amount)
    {
        address ip = _IPS.getIPAddress(_ipToken, _baseToken);
        require(ip == msg.sender, "Not Permit");

        amount = _ipTokensAmount;
        IERC20(_ipToken).safeTransferFrom(ip, address(this), amount);
        uint256 curAmount = _IPS.getIPTokensAmount(_ipToken, _baseToken);
        _IPS.setIPTokensAmount(_ipToken, _baseToken, curAmount.add(amount));

        return amount;
    }

    function qualifiedIP(
        address ip,
        address ipToken,
        address baseToken,
        uint256 ipTokensAmount,
        uint256 dgtTokensAmount,
        bool create
    )
        internal view
    {
        require(ipTokensAmount <= IERC20(ipToken).balanceOf(ip) &&
                ipTokensAmount >= IERC20(ipToken).totalSupply().mul(minRatio).div(RATIO_FACTOR),
                "Token Not Enough");

        if (!create) {
            require(dgtTokensAmount > 0 && dgtTokensAmount >= 
                    _IPS.getDGTTokensAmount(ipToken, baseToken).mul(105).div(100),
                    "Bid Price Should Increase 5%");
        }
    }

    function checkIPParams(
        uint32 _ipImpawnRatio, //(0,100%]
        uint32 _ipCloseLine, // (_ipImpawnRatio,300%]
        uint32 _chargeRatio, // (0, 100%)
        uint256 _duration
    )
        internal view
    {
        require(RATIO_FACTOR >= _ipImpawnRatio && _ipImpawnRatio > 0,
                "invalid impawnRatio");
        require(RATIO_FACTOR.mul(3) >= _ipCloseLine && _ipCloseLine > _ipImpawnRatio,
                "invalid closeLine");
        require(RATIO_FACTOR > _chargeRatio && _chargeRatio > 0,
                "invalid chargeRatio");
        require(_duration >= minimumDuration, "invalid duration");
    }
}
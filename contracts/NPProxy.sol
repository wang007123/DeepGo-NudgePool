// SPDX-License-Identifier: MIT

pragma solidity ^0.8.0;

import "@openzeppelin/contracts/access/Ownable.sol";

contract NPProxy is Ownable {
    struct LogicContracts {
        address ipc;
        address gpdc;
        address gpwc;
        address lpc;
        address vtc;
        address stc;
        address lqdc;
    }

    mapping(string => LogicContracts) internal versions;
    string[] public versionList;
    string public version;
    address public _IPC;
    address public _GPDC;
    address public _GPWC;
    address public _LPC;
    address public _VTC;
    address public _STC;
    address public _LQDC;

    function upgrade(
        string memory _newVersion,
        address _ipc,
        address _gpdc,
        address _gpwc,
        address _lpc,
        address _vtc,
        address _stc,
        address _lqdc
    )
        public onlyOwner
    {
        require(_ipc != address(0) && _gpdc != address(0) && _gpwc != address(0) &&
                _lpc != address(0) && _vtc != address(0) && _stc != address(0) &&
                _lqdc != address(0), "Wrong Address");
        require(bytes(_newVersion).length > 0, "Empty Version");
        version = _newVersion;
        _IPC = _ipc;
        _GPDC = _gpdc;
        _GPWC = _gpwc;
        _LPC = _lpc;
        _VTC = _vtc;
        _STC = _stc;
        _LQDC = _lqdc;
        versions[version].ipc = _ipc;
        versions[version].gpdc = _gpdc;
        versions[version].gpwc = _gpwc;
        versions[version].lpc = _lpc;
        versions[version].vtc = _vtc;
        versions[version].stc = _stc;
        versions[version].lqdc = _lqdc;
        versionList.push(_newVersion);
}

    function getLogicContracts(
        string calldata _version
    ) 
        external view onlyOwner
        returns(address, address, address, address, address, address, address)
    {
        require(bytes(_version).length > 0, "Empty Version");
        return (versions[_version].ipc, versions[_version].gpdc,
                versions[_version].gpwc, versions[_version].lpc,
                versions[_version].vtc, versions[_version].stc,
                versions[_version].lqdc);
    }
}
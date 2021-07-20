// SPDX-License-Identifier: MIT

pragma solidity ^0.8.0;

contract VaultStorage {
    struct VaultInfo {
        uint256     totalVault;
        uint256     ipWithdrawed;
        uint256     curVault;
        uint256     lastUpdateTime;
    }

    struct PoolInfo {
        VaultInfo   VT;
    }

    address public admin;
    address public proxy;
    mapping(address => mapping(address => PoolInfo)) private pools;

    constructor() {
        admin = msg.sender;
    }

    function setProxy(address _proxy) external {
        require(admin == msg.sender, "Not Permit");
        require(_proxy != address(0), "Invalid Address");
        proxy = _proxy;
    }

    function setTotalVault(address _ipt, address _bst, uint256 amount) external {
        require(proxy == msg.sender, "Not Permit");
        pools[_ipt][_bst].VT.totalVault = amount;
    }

    function setIPWithdrawed(address _ipt, address _bst, uint256 amount) external {
        require(proxy == msg.sender, "Not Permit");
        pools[_ipt][_bst].VT.ipWithdrawed = amount;
    }

    function setCurVault(address _ipt, address _bst, uint256 amount) external {
        require(proxy == msg.sender, "Not Permit");
        pools[_ipt][_bst].VT.curVault = amount;
    }

    function setLastUpdateTime(address _ipt, address _bst, uint256 time) external {
        require(proxy == msg.sender, "Not Permit");
        pools[_ipt][_bst].VT.lastUpdateTime = time;
    }

    function getTotalVault(address _ipt, address _bst) external view returns(uint256) {
        return pools[_ipt][_bst].VT.totalVault;
    }

    function getIPWithdrawed(address _ipt, address _bst) external view returns(uint256) {
        return pools[_ipt][_bst].VT.ipWithdrawed;
    }

    function getCurVault(address _ipt, address _bst) external view returns(uint256) {
        return pools[_ipt][_bst].VT.curVault;
    }

    function getLastUpdateTime(address _ipt, address _bst) external view returns(uint256) {
        return pools[_ipt][_bst].VT.lastUpdateTime;
    }
}
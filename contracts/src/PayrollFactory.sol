// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import {Clones} from "@openzeppelin/contracts/proxy/Clones.sol";
import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {CUSDC} from "./CUSDC.sol";
import {Payroll} from "./Payroll.sol";

/// @title PayrollFactory — one-click Payroll deployment for employers
/// @notice Deploys EIP-1167 minimal-proxy clones of a shared Payroll
///         implementation. Each clone is independently owned and has its own
///         storage for employees and encrypted treasury handles. All clones
///         share the same cUSDC wrapper and underlying USDC.
contract PayrollFactory {
    address public immutable implementation;
    CUSDC public immutable cToken;
    IERC20 public immutable underlying;

    /// @notice All payrolls ever created by a given owner address, oldest first.
    mapping(address => address[]) public payrollsOf;
    address[] public allPayrolls;

    event PayrollCreated(
        address indexed owner,
        address indexed payroll,
        uint256 index
    );

    error ZeroAddress();

    constructor(address _implementation, CUSDC _cToken, IERC20 _underlying) {
        if (_implementation == address(0)) revert ZeroAddress();
        implementation = _implementation;
        cToken = _cToken;
        underlying = _underlying;
    }

    /// @notice Deploys a fresh Payroll clone owned by `msg.sender`.
    /// @return clone Address of the newly created Payroll instance.
    function createPayroll() external returns (address clone) {
        clone = Clones.clone(implementation);
        Payroll(clone).initialize(msg.sender, cToken, underlying);
        payrollsOf[msg.sender].push(clone);
        allPayrolls.push(clone);
        emit PayrollCreated(msg.sender, clone, allPayrolls.length - 1);
    }

    function payrollCountOf(address _owner) external view returns (uint256) {
        return payrollsOf[_owner].length;
    }

    function payrollCount() external view returns (uint256) {
        return allPayrolls.length;
    }

    function latestPayrollOf(address _owner) external view returns (address) {
        address[] storage list = payrollsOf[_owner];
        if (list.length == 0) return address(0);
        return list[list.length - 1];
    }
}

// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import {externalEuint256, euint256} from "@iexec-nox/nox-protocol-contracts/contracts/sdk/Nox.sol";

/// @title IPayroll — Confidential payroll contract interface
interface IPayroll {
    event EmployeeAdded(address indexed emp);
    event EmployeeRemoved(address indexed emp);
    event Paid(address indexed emp, uint64 timestamp);
    event PayrollRun(uint64 timestamp, uint256 count);
    event Deposited(address indexed from, uint256 underlyingAmount);
    event WithdrawRequested(address indexed to, euint256 requestId);
    event WithdrawCleared(uint64 timestamp);
    event PayFailed(address indexed emp);
    event SalaryUpdated(address indexed emp);

    function deposit(uint256 amount) external;
    function addEmployee(address emp, externalEuint256 encSalary, bytes calldata proof) external;
    function updateSalary(address emp, externalEuint256 encSalary, bytes calldata proof) external;
    function removeEmployee(address emp) external;
    function payOne(address emp) external;
    function payAll() external;
    function withdrawUnderlying(externalEuint256 encAmount, bytes calldata proof) external;
    function clearWithdrawPending() external;
}

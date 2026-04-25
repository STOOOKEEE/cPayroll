// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import {IPayroll} from "./interfaces/IPayroll.sol";
import {CUSDC} from "./CUSDC.sol";
import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {SafeERC20} from "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import {
    Nox,
    euint256,
    externalEuint256
} from "@iexec-nox/nox-protocol-contracts/contracts/sdk/Nox.sol";

/// @title Payroll — Confidential payroll contract
/// @notice Owner (employer) funds the contract with USDC, wraps it into cUSDC,
///         registers employees with encrypted salaries, and triggers batch
///         confidential payments. Salaries and balances remain encrypted
///         end-to-end via ERC-7984; only addresses and timestamps are public.
contract Payroll is IPayroll {
    using SafeERC20 for IERC20;
    /// @notice Cap on the employee list to keep `payAll` gas bounded.
    uint256 public constant MAX_EMPLOYEES = 50;

    /// @notice Set to true once `initialize` has run. Starts true on the
    ///         implementation contract (locked by the constructor) so that
    ///         only clones can be initialized.
    bool private _initialized;

    address public owner;
    CUSDC public cToken;
    IERC20 public underlying;

    struct Employee {
        bool active;
        euint256 salary; // encrypted salary handle
        uint64 lastPaid;
        uint256 index; // position in employeeList
    }

    mapping(address => Employee) public employees;
    address[] public employeeList;

    /// @notice True while an async Nox unwrap is in flight against the
    ///         contract's encrypted treasury. Blocks payroll to avoid racing
    ///         the pending `finalizeUnwrap` and draining the treasury out
    ///         from under it. Owner clears it via `clearWithdrawPending()`
    ///         after observing finalize off-chain.
    bool public withdrawPending;

    error NotOwner();
    error EmployeeExists();
    error UnknownEmployee();
    error EmployeeListFull();
    error ZeroAddress();
    error WithdrawPending();
    error AlreadyInitialized();

    modifier onlyOwner() {
        if (msg.sender != owner) revert NotOwner();
        _;
    }

    /// @notice Locks the implementation contract. Clones are fresh storage
    ///         so `_initialized = true` here does NOT propagate to them.
    constructor() {
        _initialized = true;
    }

    /// @notice Sets owner + token refs on a fresh clone. Callable once.
    /// @dev    Typically invoked by `PayrollFactory.createPayroll` atomically
    ///         after `Clones.clone`, so end users never see an uninitialized
    ///         Payroll on-chain.
    function initialize(address _owner, CUSDC _cToken, IERC20 _underlying) external {
        if (_initialized) revert AlreadyInitialized();
        if (_owner == address(0)) revert ZeroAddress();
        _initialized = true;
        owner = _owner;
        cToken = _cToken;
        underlying = _underlying;
    }

    /// @inheritdoc IPayroll
    function deposit(uint256 amount) external onlyOwner {
        underlying.safeTransferFrom(msg.sender, address(this), amount);
        underlying.forceApprove(address(cToken), amount);
        cToken.wrap(address(this), amount);
        emit Deposited(msg.sender, amount);
    }

    /// @inheritdoc IPayroll
    function addEmployee(address emp, externalEuint256 encSalary, bytes calldata proof)
        external
        onlyOwner
    {
        if (emp == address(0)) revert ZeroAddress();
        if (employees[emp].active) revert EmployeeExists();
        if (employeeList.length >= MAX_EMPLOYEES) revert EmployeeListFull();

        euint256 salary = Nox.fromExternal(encSalary, proof);
        Nox.allowThis(salary);
        Nox.allow(salary, address(cToken));

        employees[emp] = Employee({
            active: true,
            salary: salary,
            lastPaid: 0,
            index: employeeList.length
        });
        employeeList.push(emp);

        emit EmployeeAdded(emp);
    }

    /// @inheritdoc IPayroll
    function updateSalary(address emp, externalEuint256 encSalary, bytes calldata proof)
        external
        onlyOwner
    {
        Employee storage e = employees[emp];
        if (!e.active) revert UnknownEmployee();

        euint256 salary = Nox.fromExternal(encSalary, proof);
        Nox.allowThis(salary);
        Nox.allow(salary, address(cToken));
        e.salary = salary;
        emit SalaryUpdated(emp);
    }

    /// @inheritdoc IPayroll
    function removeEmployee(address emp) external onlyOwner {
        Employee storage e = employees[emp];
        if (!e.active) revert UnknownEmployee();

        uint256 idx = e.index;
        uint256 last = employeeList.length - 1;
        if (idx != last) {
            address moved = employeeList[last];
            employeeList[idx] = moved;
            employees[moved].index = idx;
        }
        employeeList.pop();
        delete employees[emp];

        emit EmployeeRemoved(emp);
    }

    /// @inheritdoc IPayroll
    /// @dev Reverts with `WithdrawPending` when an unwrap request is
    ///      in-flight, so callers get a clear signal instead of a silent
    ///      treasury race.
    function payOne(address emp) external onlyOwner {
        if (withdrawPending) revert WithdrawPending();
        Employee storage e = employees[emp];
        if (!e.active) revert UnknownEmployee();
        cToken.confidentialTransfer(emp, e.salary);
        e.lastPaid = uint64(block.timestamp);
        emit Paid(emp, uint64(block.timestamp));
    }

    /// @inheritdoc IPayroll
    /// @dev Reverts at the top when `withdrawPending` is set. Reverting
    ///      (rather than skipping inside the loop) is cleaner: there is
    ///      nothing useful `payAll` can do while the treasury is locked for
    ///      an in-flight unwrap, and it gives the operator a single
    ///      actionable error.
    function payAll() external onlyOwner {
        if (withdrawPending) revert WithdrawPending();
        uint256 n = employeeList.length;
        uint64 ts = uint64(block.timestamp);
        uint256 paid;
        for (uint256 i = 0; i < n; ++i) {
            address emp = employeeList[i];
            Employee storage e = employees[emp];
            if (!e.active) continue;
            try cToken.confidentialTransfer(emp, e.salary) returns (euint256) {
                e.lastPaid = ts;
                emit Paid(emp, ts);
                ++paid;
            } catch {
                emit PayFailed(emp);
            }
        }
        emit PayrollRun(ts, paid);
    }

    /// @inheritdoc IPayroll
    /// @notice Emergency exit: request an unwrap of cUSDC back to USDC routed to the owner.
    /// @dev Step 1 of the Nox 2-step async unwrap. The TEE later finalizes via
    ///      `cToken.finalizeUnwrap(requestId, decryptedAmountAndProof)`, which
    ///      releases plain USDC directly to `owner`. The encrypted amount is
    ///      supplied by the caller (employer) so this contract never holds a
    ///      plaintext figure.
    /// @dev Sets `withdrawPending` which blocks `payOne`/`payAll` until the
    ///      owner calls `clearWithdrawPending` — there is no on-chain
    ///      callback from Nox finalize, so acknowledgement is manual.
    /// @dev Recipient is captured as the current `owner` at request time and
    ///      baked into the Nox unwrap request. A subsequent
    ///      `transferOwnership` (if/when added) will NOT redirect an
    ///      in-flight unwrap — funds go to the original owner. This is
    ///      intentional: prevents ownership-hijack griefing of pending
    ///      withdrawals.
    function withdrawUnderlying(externalEuint256 encAmount, bytes calldata proof)
        external
        onlyOwner
    {
        if (withdrawPending) revert WithdrawPending();
        euint256 amount = Nox.fromExternal(encAmount, proof);
        Nox.allowThis(amount);
        Nox.allow(amount, address(cToken));
        withdrawPending = true;
        euint256 requestId = cToken.unwrap(address(this), owner, amount);
        emit WithdrawRequested(owner, requestId);
    }

    /// @inheritdoc IPayroll
    /// @notice Owner acknowledges that a prior `withdrawUnderlying` request
    ///         has finalized off-chain, re-enabling payroll operations.
    function clearWithdrawPending() external onlyOwner {
        if (!withdrawPending) revert WithdrawPending();
        withdrawPending = false;
        emit WithdrawCleared(uint64(block.timestamp));
    }

    function employeeCount() external view returns (uint256) {
        return employeeList.length;
    }
}

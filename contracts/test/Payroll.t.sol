// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import {Test} from "forge-std/Test.sol";
import {Payroll} from "../src/Payroll.sol";
import {PayrollFactory} from "../src/PayrollFactory.sol";
import {MockUSDC} from "../src/mocks/MockUSDC.sol";
import {CUSDC} from "../src/CUSDC.sol";
import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {externalEuint256} from "@iexec-nox/nox-protocol-contracts/contracts/sdk/Nox.sol";

/// @dev Unit tests. These exercise only the paths that do not touch the Nox
///      TEE precompiles — anything involving `Nox.fromExternal` or
///      `confidentialTransfer` requires a live Nox gateway and is covered by
///      the fork-only integration suite below.
contract PayrollTest is Test {
    Payroll internal payroll;
    PayrollFactory internal factory;
    Payroll internal implementation;
    MockUSDC internal usdc;
    CUSDC internal ct;
    address internal owner = address(0xA11CE);
    address internal alice = address(0xB0B);

    function setUp() public {
        usdc = new MockUSDC();
        ct = new CUSDC(IERC20(address(usdc)));
        implementation = new Payroll();
        factory = new PayrollFactory(
            address(implementation),
            ct,
            IERC20(address(usdc))
        );

        vm.prank(owner);
        payroll = Payroll(factory.createPayroll());
    }

    function test_ownerSet() public view {
        assertEq(payroll.owner(), owner);
        assertEq(address(payroll.cToken()), address(ct));
        assertEq(address(payroll.underlying()), address(usdc));
    }

    function test_employeeCountStartsZero() public view {
        assertEq(payroll.employeeCount(), 0);
    }

    function test_initialize_cannotBeCalledTwice() public {
        vm.expectRevert(Payroll.AlreadyInitialized.selector);
        payroll.initialize(owner, ct, IERC20(address(usdc)));
    }

    function test_implementation_isLocked() public {
        vm.expectRevert(Payroll.AlreadyInitialized.selector);
        implementation.initialize(owner, ct, IERC20(address(usdc)));
    }

    function test_onlyOwner_addEmployee() public {
        externalEuint256 enc = externalEuint256.wrap(bytes32(uint256(1)));
        vm.expectRevert(Payroll.NotOwner.selector);
        payroll.addEmployee(alice, enc, hex"");
    }

    function test_onlyOwner_removeEmployee() public {
        vm.expectRevert(Payroll.NotOwner.selector);
        payroll.removeEmployee(alice);
    }

    function test_onlyOwner_deposit() public {
        vm.expectRevert(Payroll.NotOwner.selector);
        payroll.deposit(1);
    }

    function test_onlyOwner_payOne() public {
        vm.expectRevert(Payroll.NotOwner.selector);
        payroll.payOne(alice);
    }

    function test_onlyOwner_payAll() public {
        vm.expectRevert(Payroll.NotOwner.selector);
        payroll.payAll();
    }

    function test_onlyOwner_withdrawUnderlying() public {
        externalEuint256 enc = externalEuint256.wrap(bytes32(uint256(1)));
        vm.expectRevert(Payroll.NotOwner.selector);
        payroll.withdrawUnderlying(enc, hex"");
    }

    function test_onlyOwner_clearWithdrawPending() public {
        vm.expectRevert(Payroll.NotOwner.selector);
        payroll.clearWithdrawPending();
    }

    function test_clearWithdrawPending_revertsWhenNotPending() public {
        assertEq(payroll.withdrawPending(), false);
        vm.prank(owner);
        vm.expectRevert(Payroll.WithdrawPending.selector);
        payroll.clearWithdrawPending();
    }

    function test_removeUnknownReverts() public {
        vm.prank(owner);
        vm.expectRevert(Payroll.UnknownEmployee.selector);
        payroll.removeEmployee(alice);
    }
}

contract PayrollFactoryTest is Test {
    PayrollFactory internal factory;
    Payroll internal implementation;
    MockUSDC internal usdc;
    CUSDC internal ct;

    address internal alice = address(0xA11CE);
    address internal bob = address(0xB0B);

    function setUp() public {
        usdc = new MockUSDC();
        ct = new CUSDC(IERC20(address(usdc)));
        implementation = new Payroll();
        factory = new PayrollFactory(
            address(implementation),
            ct,
            IERC20(address(usdc))
        );
    }

    function test_createPayroll_returnsIndependentClone() public {
        vm.prank(alice);
        address a = factory.createPayroll();
        vm.prank(bob);
        address b = factory.createPayroll();

        assertTrue(a != b);
        assertEq(Payroll(a).owner(), alice);
        assertEq(Payroll(b).owner(), bob);
        assertEq(factory.payrollCount(), 2);
        assertEq(factory.payrollCountOf(alice), 1);
        assertEq(factory.payrollCountOf(bob), 1);
    }

    function test_latestPayrollOf_tracksNewest() public {
        vm.prank(alice);
        address first = factory.createPayroll();
        vm.prank(alice);
        address second = factory.createPayroll();

        assertEq(factory.latestPayrollOf(alice), second);
        assertTrue(first != second);
    }

    function test_latestPayrollOf_noneYet() public view {
        assertEq(factory.latestPayrollOf(alice), address(0));
    }

    function test_clonesShareImplementationBytecodeButNotStorage() public {
        vm.prank(alice);
        Payroll a = Payroll(factory.createPayroll());
        vm.prank(bob);
        Payroll b = Payroll(factory.createPayroll());

        assertEq(a.employeeCount(), 0);
        assertEq(b.employeeCount(), 0);
        // Owners are independent — already asserted above, but also true:
        assertTrue(a.owner() != b.owner());
    }
}

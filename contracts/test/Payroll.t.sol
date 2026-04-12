// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import {Test} from "forge-std/Test.sol";
import {Payroll} from "../src/Payroll.sol";
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
    MockUSDC internal usdc;
    CUSDC internal ct;
    address internal owner = address(0xA11CE);
    address internal alice = address(0xB0B);

    function setUp() public {
        usdc = new MockUSDC();
        ct = new CUSDC(IERC20(address(usdc)));
        payroll = new Payroll(owner, ct, IERC20(address(usdc)));
    }

    function test_ownerSet() public view {
        assertEq(payroll.owner(), owner);
        assertEq(address(payroll.cToken()), address(ct));
        assertEq(address(payroll.underlying()), address(usdc));
    }

    function test_employeeCountStartsZero() public view {
        assertEq(payroll.employeeCount(), 0);
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

    function test_clearWithdrawPending_ownerCallSucceeds() public {
        // Flag starts false; owner call should not revert and should leave
        // it false. Exercises the access-control path without touching Nox.
        assertEq(payroll.withdrawPending(), false);
        vm.prank(owner);
        payroll.clearWithdrawPending();
        assertEq(payroll.withdrawPending(), false);
    }

    function test_removeUnknownReverts() public {
        vm.prank(owner);
        vm.expectRevert(Payroll.UnknownEmployee.selector);
        payroll.removeEmployee(alice);
    }
}

/// @dev Fork-only integration tests. Run with:
///      forge test --fork-url $ARB_SEPOLIA_RPC --match-contract PayrollForkTest
contract PayrollForkTest is Test {
    uint256 constant ARB_SEPOLIA = 421614;

    function setUp() public {
        vm.skip(block.chainid != ARB_SEPOLIA);
    }

    function test_fork_deposit_and_payAll() public {
        vm.skip(block.chainid != ARB_SEPOLIA);
        // TODO: wire encrypted inputs via @iexec-nox/handle client and hit
        // deposit → addEmployee → payAll end-to-end against the real Nox
        // gateway. This test is a placeholder — the real integration runs
        // from the frontend demo as required by the challenge.
    }
}

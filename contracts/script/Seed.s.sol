// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import {Script, console2} from "forge-std/Script.sol";
import {Payroll} from "../src/Payroll.sol";

/// @notice Seeds sample employees on a deployed Payroll for demo purposes.
/// @dev    Fill PAYROLL_ADDR in env before running. Encrypted salaries are
///         placeholder bytes here; real values must be generated client-side
///         via the Nox SDK in the next implementation pass.
contract Seed is Script {
    function run() external {
        uint256 pk = vm.envUint("DEPLOYER_PK");
        address payrollAddr = vm.envAddress("PAYROLL_ADDR");
        Payroll payroll = Payroll(payrollAddr);

        vm.startBroadcast(pk);
        // TODO: call payroll.addEmployee with real Nox-encrypted salaries
        vm.stopBroadcast();

        console2.log("Seeded payroll at", address(payroll));
    }
}

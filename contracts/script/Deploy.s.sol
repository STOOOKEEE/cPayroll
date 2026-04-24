// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import {Script, console2} from "forge-std/Script.sol";
import {CUSDC} from "../src/CUSDC.sol";
import {Payroll} from "../src/Payroll.sol";
import {PayrollFactory} from "../src/PayrollFactory.sol";
import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";

/// @notice Deploys the full cPayroll stack on top of an existing USDC token:
///         1. CUSDC  — the ERC-7984 wrapper
///         2. Payroll implementation (locked, logic only)
///         3. PayrollFactory
///         4. A default Payroll instance for the deployer via the factory,
///            so the demo UI works out of the box without a separate deploy
///            step.
///         Set USDC_ADDR in env. If CUSDC_ADDR is set, reuses an existing
///         CUSDC rather than deploying a fresh one.
contract Deploy is Script {
    function run() external {
        uint256 pk = vm.envUint("DEPLOYER_PK");
        address deployer = vm.addr(pk);
        address usdc = vm.envAddress("USDC_ADDR");
        address existingCUSDC = vm.envOr("CUSDC_ADDR", address(0));

        vm.startBroadcast(pk);

        CUSDC c = existingCUSDC == address(0)
            ? new CUSDC(IERC20(usdc))
            : CUSDC(existingCUSDC);

        Payroll implementation = new Payroll();
        PayrollFactory factory = new PayrollFactory(
            address(implementation),
            c,
            IERC20(usdc)
        );

        address defaultPayroll = factory.createPayroll();

        vm.stopBroadcast();

        console2.log("USDC:            ", usdc);
        console2.log("CUSDC:           ", address(c));
        console2.log("Payroll impl:    ", address(implementation));
        console2.log("PayrollFactory:  ", address(factory));
        console2.log("Default Payroll: ", defaultPayroll);
        console2.log("Owner:           ", deployer);
    }
}

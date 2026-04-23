// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import {Script, console2} from "forge-std/Script.sol";
import {CUSDC} from "../src/CUSDC.sol";
import {Payroll} from "../src/Payroll.sol";
import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";

/// @notice Deploys CUSDC (ERC-7984 wrapper) + Payroll on top of an existing
///         USDC token on Arbitrum Sepolia. USDC is Circle testnet USDC by
///         default: 0x75faf114eafb1BDbe2F0316DF893fd58CE46AA4d.
///         Set USDC_ADDR in env to override.
contract Deploy is Script {
    function run() external {
        uint256 pk = vm.envUint("DEPLOYER_PK");
        address deployer = vm.addr(pk);
        address usdc = vm.envAddress("USDC_ADDR");

        vm.startBroadcast(pk);

        CUSDC c = new CUSDC(IERC20(usdc));
        Payroll payroll = new Payroll(deployer, c, IERC20(usdc));

        vm.stopBroadcast();

        console2.log("USDC:    ", usdc);
        console2.log("CUSDC:   ", address(c));
        console2.log("Payroll: ", address(payroll));
    }
}

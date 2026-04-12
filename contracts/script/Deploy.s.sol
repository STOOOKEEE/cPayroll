// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import {Script, console2} from "forge-std/Script.sol";
import {MockUSDC} from "../src/mocks/MockUSDC.sol";
import {CUSDC} from "../src/CUSDC.sol";
import {Payroll} from "../src/Payroll.sol";
import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";

contract Deploy is Script {
    function run() external {
        uint256 pk = vm.envUint("DEPLOYER_PK");
        address deployer = vm.addr(pk);

        vm.startBroadcast(pk);

        MockUSDC usdc = new MockUSDC();
        CUSDC c = new CUSDC(IERC20(address(usdc)));
        Payroll payroll = new Payroll(deployer, c, IERC20(address(usdc)));

        vm.stopBroadcast();

        console2.log("MockUSDC: ", address(usdc));
        console2.log("CUSDC:    ", address(c));
        console2.log("Payroll:  ", address(payroll));
    }
}

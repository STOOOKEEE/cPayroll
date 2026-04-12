// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import {ERC20ToERC7984Wrapper} from
    "@iexec-nox/nox-confidential-contracts/contracts/token/extensions/ERC20ToERC7984Wrapper.sol";
import {ERC7984} from "@iexec-nox/nox-confidential-contracts/contracts/token/ERC7984.sol";
import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";

/// @title CUSDC — Confidential USDC wrapper (ERC-7984)
/// @notice Thin concrete child of the official Nox ERC20ToERC7984Wrapper.
contract CUSDC is ERC20ToERC7984Wrapper {
    constructor(IERC20 underlying_)
        ERC7984("Confidential USDC", "cUSDC", "")
        ERC20ToERC7984Wrapper(underlying_)
    {}
}

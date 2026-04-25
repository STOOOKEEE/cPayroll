# Feedback on iExec tools

Ongoing notes while building cPayroll on iExec Nox for the Vibe Coding Challenge. Filled progressively.

## Setup

Onboarding was smooth overall. The `cdefi-wizard` gave a working scaffold in under a minute, and the faucet at `cdefi.iex.ec` distributed test cUSDC reliably during dev. The main friction was figuring out which `@iexec-nox/*` package to use for client-side operations — the npm org has several beta packages and the naming doesn't immediately tell you which one handles encryption vs. contract interaction.

Docs at `docs.iex.ec` cover the high-level concepts well, but practical "first 5 minutes" tutorials are sparse. We spent time cross-referencing README files in the npm packages with the docs site to piece together the right import path.

## Nox SDK

**Versions used:** `@iexec-nox/handle@0.1.0-beta.10`, `@iexec-nox/nox-protocol-contracts@0.1.0-beta.9`, `@iexec-nox/nox-confidential-contracts@0.1.0-beta.2`.

`@iexec-nox/handle` provides a clean API for client-side encryption (`encryptInput`) and decryption (`decrypt`). The `createViemHandleClient` factory integrating directly with viem's `WalletClient` is well-designed and saved us from writing adapter boilerplate.

Pain points:
- TypeScript types are loose in beta — `Handle<T>` is branded at runtime but generic enough that we needed `as never` casts to satisfy the compiler when passing handles to `decrypt()`.
- Error messages on failed encryption (wrong contract address, missing ACL grant) are opaque — a hex error code with no human-readable context.
- Decryption request latency is noticeable (~2-4s on Arbitrum Sepolia). Not blocking, but we added an optimistic UI pattern to keep the UX responsive.

## cdefi-wizard

The wizard output for the ERC-7984 wrapper (`ERC20ToERC7984Wrapper`) was production-quality — a single-line constructor extending the base class. Zero manual intervention needed.

One improvement: the wizard doesn't offer Foundry remappings out of the box. We had to manually set up `remappings.txt` for `@iexec-nox/nox-protocol-contracts` and `@iexec-nox/nox-confidential-contracts`. Hardhat users probably don't hit this.

## ERC-7984

The encrypted type handling (`euint256`, `externalEuint256`) is conceptually clean. The `Nox.fromExternal` + proof verification flow makes sense once you understand it, but the distinction between `euint` and `externalEuint` tripped us up initially — docs could benefit from a diagram showing the lifecycle.

The `confidentialTransfer` + `confidentialBalanceOf` surface maps well to ERC-20 mental models, which made the payroll logic straightforward. View-key flow for balance decryption works as expected.

Composability with standard ERC-20 tooling (block explorers, wagmi read hooks) is good for public fields but obviously limited for encrypted fields — expected, but worth noting that tools like Arbiscan show `euint256` values as raw hex with no indication they're encrypted.

## DX pain points

- **No on-chain callback for `finalizeUnwrap`**: the 2-step async unwrap pattern (request → TEE finalizes off-chain) leaves a gap where the contract has no way to know when the unwrap completed. We had to implement a manual `clearWithdrawPending()` pattern which is fragile. An event or callback from the cUSDC contract when `finalizeUnwrap` executes would eliminate this.
- **Nox SDK is browser-only**: we couldn't generate encrypted inputs in Foundry scripts (`Seed.s.sol`) because the Nox SDK requires a browser wallet context. Our seeding pipeline had to be built entirely in the frontend.
- **Beta package churn**: `@iexec-nox/handle` at `0.1.0-beta.10` — API surface feels stable but the beta tag makes dependency management cautious. Pinning exact versions was necessary.

## What we loved

- The core value prop delivers: encrypted salaries on-chain with zero plaintext leakage is genuinely impressive. Block explorer verification confirms no amounts visible.
- `createViemHandleClient` integration with viem is elegant — no adapter layer needed.
- The ACL permission model (`Nox.allowThis`, `Nox.allow`) is intuitive for controlling who can operate on encrypted values.
- Arbitrum Sepolia deployment was painless — gas costs for confidential transfers are reasonable (~200k gas per `confidentialTransfer`).
- The Discord community (Vibe Coding channel) was responsive when we had questions.

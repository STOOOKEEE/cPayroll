# cPayroll

Confidential payroll dApp for DAOs and crypto-native companies. Individual salaries stay private on-chain, built on [iExec Nox](https://docs.iex.ec/nox-protocol/getting-started/welcome) and ERC-7984 Confidential Tokens. Deployed on Arbitrum Sepolia.

Submitted to the iExec **Vibe Coding Challenge**.

## Monorepo layout

```
contracts/   Foundry — Payroll.sol + cUSDC wrapper
web/         Next.js 14 App Router — employer + employee UIs
scripts/     tooling (ABI generation)
audits/      ChainGPT audit reports
```

## Prerequisites

- Node 20+, pnpm 9+
- Foundry (`curl -L https://foundry.paradigm.xyz | bash && foundryup`)
- A wallet with Arbitrum Sepolia ETH ([faucet](https://faucet.quicknode.com/arbitrum/sepolia))
- Test cUSDC from https://cdefi.iex.ec

## Setup

```bash
cp .env.example .env
pnpm install
pnpm contracts:build
```

## Deploy contracts

```bash
pnpm deploy:sepolia
```

Copy the printed addresses into `.env` under the `NEXT_PUBLIC_*_ADDR` keys, then:

```bash
pnpm gen-abi
```

## Run the frontend

```bash
pnpm dev
```

Open http://localhost:3000.

## Architecture

See [`CLAUDE.md`](./CLAUDE.md) for the full architectural reference.

## Links

- iExec Nox docs: https://docs.iex.ec/nox-protocol/getting-started/welcome
- Confidential wizard: https://cdefi-wizard.iex.ec
- Confidential token demo + faucet: https://cdefi.iex.ec
- ChainGPT: https://chaingpt.org

# cPayroll

Confidential payroll dApp for DAOs and crypto-native companies. Individual salaries stay private on-chain, built on [iExec Nox](https://docs.iex.ec/nox-protocol/getting-started/welcome) and ERC-7984 Confidential Tokens. Deployed on Arbitrum Sepolia.

Submitted to the iExec **Vibe Coding Challenge**.

## How it works

Employers deposit USDC, which is automatically wrapped into cUSDC (an ERC-7984 confidential token). Salaries are encrypted client-side via the Nox SDK before being stored on-chain. When `payAll` is called, confidential transfers are executed — observers see that payments happened, but never how much.

Employees decrypt their own balance locally in the browser using a Nox view key, and can unwrap cUSDC back to plain USDC at any time.

## Monorepo layout

```
contracts/   Foundry — Payroll.sol, PayrollFactory.sol, cUSDC wrapper
web/         Next.js 14 App Router — employer + employee UIs
scripts/     tooling (ABI generation, ChainGPT audit)
audits/      ChainGPT audit reports
```

## Prerequisites

- Node 20+, pnpm 9+
- Foundry (`curl -L https://foundry.paradigm.xyz | bash && foundryup`)
- A wallet with Arbitrum Sepolia ETH ([faucet](https://faucet.quicknode.com/arbitrum/sepolia))
- Test USDC from [faucet.circle.com](https://faucet.circle.com) or test cUSDC from [cdefi.iex.ec](https://cdefi.iex.ec)

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

## User flows

### Employer

1. Connect wallet on the landing page
2. Go to **TREASURY** → approve + deposit USDC (wraps to cUSDC automatically)
3. Go to **TEAM** → add employees with their address and monthly salary (encrypted client-side before tx)
4. Back to **DASHBOARD** → click **RUN_PAYROLL** to batch-pay all employees via confidential transfers
5. Optionally use **DEPLOY** to create an isolated payroll clone via the EIP-1167 factory

### Employee

1. Connect wallet → go to **EMPLOYEE** tab
2. View encrypted balance handle on-chain
3. Click **REVEAL_LOCALLY** to decrypt balance in-browser (never leaves the tab)
4. Enter an amount and **UNWRAP_SALARY** to convert cUSDC back to plain USDC

### Quick demo

Use the **SEED** page to run a full automated pipeline: approve → deposit → add 3 test employees → payAll — all in one click.

## Architecture

### Smart contracts

- **Payroll.sol** — core payroll logic (deposit, addEmployee, payOne, payAll, withdrawUnderlying), EIP-1167 clone-compatible
- **PayrollFactory.sol** — deploys minimal proxy clones, one per employer, shared cUSDC/USDC
- **CUSDC.sol** — ERC-7984 confidential wrapper around USDC, scaffolded via cdefi-wizard

### Confidentiality model

| Data | Visibility |
|---|---|
| Employee addresses | public |
| Payment timestamps | public |
| Salaries | encrypted (owner + employee via view key) |
| Balances | encrypted (employee only) |
| Payment amounts | encrypted in tx calldata |

### Tech stack

- Next.js 14 (App Router), TypeScript strict, Tailwind CSS
- wagmi v2 + viem + RainbowKit
- `@iexec-nox/handle` for client-side encryption/decryption
- Foundry for contracts
- Arbitrum Sepolia (chainId 421614)

## Links

- iExec Nox docs: https://docs.iex.ec/nox-protocol/getting-started/welcome
- Confidential wizard: https://cdefi-wizard.iex.ec
- Confidential token demo + faucet: https://cdefi.iex.ec
- ChainGPT: https://chaingpt.org

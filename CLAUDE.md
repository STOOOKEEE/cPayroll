# cPayroll — Architecture & Technical Reference

Confidential payroll dApp built on iExec Nox + ERC-7984 Confidential Tokens, deployed on Arbitrum Sepolia.

---

## 1. System overview

```
┌─────────────────┐        ┌──────────────────┐        ┌────────────────────┐
│   Next.js app   │◄──────►│  Arbitrum Sepolia│◄──────►│  iExec Nox TEE     │
│  (employer UI   │ wagmi  │   smart contracts│  Nox   │  (off-chain conf.  │
│  + employee UI) │  viem  │                  │  SDK   │   computation)     │
└────────┬────────┘        └────────┬─────────┘        └─────────┬──────────┘
         │                          │                            │
         │                          │                            │
    ┌────▼─────┐              ┌─────▼──────┐              ┌──────▼──────┐
    │ Nox SDK  │              │  Payroll   │              │ Encrypted   │
    │ (client  │              │  .sol      │              │ state       │
    │  crypto) │              │  cUSDC     │              │ (balances,  │
    └──────────┘              │  (ERC-7984)│              │  amounts)   │
                              │  USDC mock │              └─────────────┘
                              └────────────┘
                                   │
                              ┌────▼────────┐
                              │ ChainGPT    │
                              │ audit + gen │
                              │ (off-chain) │
                              └─────────────┘
```

Three planes:
- **On-chain public plane** — addresses, tx order, contract state that is *not* encrypted (employee set, event logs minus amounts).
- **On-chain confidential plane** — ERC-7984 encrypted balances and encrypted transfer amounts. Ciphertexts live on-chain but only Nox TEE can operate on them.
- **Off-chain TEE plane** — Nox runs confidential computations (balance updates, transfer validation) inside TEE and posts results back on-chain.

---

## 2. Protocol stack

### 2.1 iExec Nox
Confidential compute layer combining on-chain contracts + off-chain TEE. Nox processes encrypted inputs, runs computation in attestable TEE, returns encrypted state updates on-chain. Composable with standard EVM contracts.

**What we use from Nox:**
- `@iexec-nox/*` npm packages (SDK for encryption, attestation, contract interaction)
- The `cdefi-wizard` to scaffold the confidential token wrapper
- The faucet at `cdefi.iex.ec` for test cUSDC during dev

### 2.2 ERC-7984 — Confidential Fungible Token
Token standard for confidential balances/transfers. Balances are encrypted; transfers take encrypted amounts; only the holder (and authorized viewers) can decrypt their own balance via view keys.

**Critical:** the challenge requires **full spec compliance** — encrypted types must be handled correctly end-to-end. Partial implementations are disqualified.

Key ERC-7984 surface we rely on:
- `confidentialBalanceOf(address) → euint`
- `confidentialTransfer(address to, euint amount)`
- `confidentialTransferFrom(address from, address to, euint amount)`
- View-key / decryption request flow for users to read their own balance

### 2.3 Wrapper model
`cUSDC` is a reversible wrapper around test-USDC:
- `wrap(uint256 amount)` — user deposits plain USDC, receives equal cUSDC (encrypted balance)
- `unwrap(euint amount)` — user burns encrypted cUSDC, receives plain USDC

Wrapping is the bridge between the public and confidential planes.

### 2.4 ChainGPT (AI layer)
Used at two levels:
- **Dev-time:** contract generator + auditor, report committed to `/audits`
- **Runtime:** natural-language payroll actions (e.g. "pay everyone their November salary") turned into tx calldata via ChainGPT API, then signed by the employer

---

## 3. Smart contract architecture

### 3.1 Contracts

```
contracts/
├── Payroll.sol           # core payroll logic, owner-gated
├── interfaces/
│   ├── IERC7984.sol      # confidential token interface
│   └── IPayroll.sol
├── mocks/
│   └── MockUSDC.sol      # test USDC for Arbitrum Sepolia (6 decimals)
└── vendor/
    └── cUSDC.sol         # ERC-7984 wrapper, scaffolded via cdefi-wizard
```

### 3.2 `Payroll.sol` — state

```solidity
address public owner;                         // employer
IERC7984 public immutable cToken;             // cUSDC
IERC20   public immutable underlying;         // USDC

struct Employee {
    bool    active;
    euint64 salary;    // encrypted salary in cUSDC units
    uint64  lastPaid;  // timestamp (public)
}

mapping(address => Employee) public employees;
address[] public employeeList;                // for iteration in payAll
```

### 3.3 `Payroll.sol` — methods

| Method | Caller | Effect |
|---|---|---|
| `deposit(uint256 amount)` | owner | pulls USDC, calls `cToken.wrap`, credits Payroll contract's confidential balance |
| `addEmployee(address emp, einput encSalary, bytes proof)` | owner | registers employee with encrypted salary |
| `updateSalary(address emp, einput encSalary, bytes proof)` | owner | rotates encrypted salary |
| `removeEmployee(address emp)` | owner | deactivates |
| `payOne(address emp)` | owner | `cToken.confidentialTransfer(emp, employees[emp].salary)` |
| `payAll()` | owner | loops `employeeList`, calls `payOne` logic inline; updates `lastPaid` |
| `withdrawUnderlying(uint256 amount)` | owner | emergency exit, unwraps cUSDC → USDC |

Employees never call Payroll directly — they interact with cUSDC to view their balance and unwrap.

### 3.4 Events
Events emit addresses and timestamps only. **Never** emit plaintext amounts. Encrypted amounts may be emitted as `euint` handles if useful for indexing, but the demo should visibly show explorer logs with no readable amounts.

```solidity
event EmployeeAdded(address indexed emp);
event EmployeeRemoved(address indexed emp);
event Paid(address indexed emp, uint64 timestamp);
event PayrollRun(uint64 timestamp, uint256 count);
event Deposited(address indexed from, uint256 underlyingAmount);
```

### 3.5 Access control
- `onlyOwner` modifier on all write paths
- Ownership transferable (single-sig for v1, multisig-ready interface)
- No pause / no upgradeability in v1 — keep attack surface minimal

### 3.6 Gas / loop safety
`payAll` loops employees. Cap `employeeList.length` at 50 for v1 to avoid gas blowup. Document the limit in README and in the Solidity NatSpec.

---

## 4. Frontend architecture

### 4.1 Stack
- Next.js 14+ (App Router), TypeScript strict
- wagmi v2 + viem + RainbowKit for wallet
- `@iexec-nox/sdk` for client-side encryption/decryption
- TanStack Query (via wagmi) for on-chain reads
- Tailwind + shadcn/ui
- Zod for env + form validation
- Foundry for contracts, `forge script` for deploys

### 4.2 Routes

```
app/
├── page.tsx                  # landing + connect
├── employer/
│   ├── page.tsx              # dashboard: balance, employees, run payroll
│   ├── deposit/page.tsx      # wrap USDC → cUSDC into Payroll
│   └── employees/page.tsx    # CRUD employees with encrypted salaries
├── employee/
│   └── page.tsx              # self balance (decrypted client-side), history, unwrap
└── api/
    └── chaingpt/
        └── audit/route.ts    # proxy to ChainGPT audit API (keeps key server-side)
```

### 4.3 Client-side encryption flow

When the employer sets an employee salary:

```
1. User enters plaintext amount in UI
2. nox.encrypt(amount, cTokenAddress, employerAddress) → { einput, proof }
3. wagmi writeContract → Payroll.addEmployee(emp, einput, proof)
4. Nox TEE verifies proof, contract stores euint
```

When an employee views their own balance:

```
1. cToken.confidentialBalanceOf(self) → euint handle
2. nox.requestDecryption(handle) → signed decryption request
3. Nox TEE returns plaintext to the requesting wallet only
4. UI displays decrypted balance; never leaves the browser
```

### 4.4 State management rules
- No plaintext amount ever persisted in React state longer than needed for rendering
- No plaintext amount ever sent to a backend (including our own API routes)
- ChainGPT API calls never include balances or salaries — only contract addresses, ABI, and public metadata

---

## 5. Data & trust model

| Data | Where | Who can read |
|---|---|---|
| Employee addresses | on-chain, plaintext | everyone |
| Employee salary | on-chain, encrypted (euint) | owner + employee (via view key) |
| Employee balance | on-chain, encrypted | employee only |
| Payment timestamps | on-chain, plaintext | everyone |
| Payment amounts | encrypted in tx calldata | owner + recipient |
| Aggregate treasury balance | encrypted | owner only |

Threat model:
- **Public chain observer** learns: who is an employee, when they were paid, never how much.
- **Malicious employee** learns: their own balance and payments, nothing about colleagues.
- **Compromised frontend** can trick the user into signing bad tx but cannot exfiltrate historical plaintext (it was never stored).
- **TEE compromise** is out of scope — we trust iExec Nox's attestation model.

---

## 6. Repo layout

```
iexec/
├── CLAUDE.md                 # this file
├── README.md                 # user-facing quickstart
├── feedback.md               # iExec tooling feedback (required by challenge)
├── .env.example
├── contracts/                # Foundry project
│   ├── foundry.toml
│   ├── src/
│   ├── script/
│   │   ├── Deploy.s.sol
│   │   └── Seed.s.sol        # deploy + add sample employees on Arb Sepolia
│   └── test/
├── web/                      # Next.js app
│   ├── app/
│   ├── components/
│   ├── lib/
│   │   ├── nox.ts            # Nox SDK wrapper
│   │   ├── contracts.ts      # addresses + ABIs (generated)
│   │   └── chaingpt.ts       # ChainGPT client (server-only)
│   └── package.json
├── audits/
│   └── chaingpt-payroll.md   # AI audit report
└── scripts/
    └── gen-abi.ts            # copies ABIs from contracts → web/lib
```

Contracts and web are independent packages; a root `pnpm-workspace.yaml` ties them together.

---

## 7. Code dynamics & conventions

### 7.1 Contract dev loop
1. Edit `contracts/src/*.sol`
2. `forge test -vvv`
3. `forge script script/Deploy.s.sol --rpc-url $ARB_SEPOLIA_RPC --broadcast --verify`
4. `pnpm gen-abi` copies ABIs into `web/lib/contracts.ts`
5. Web auto-reloads

### 7.2 Frontend dev loop
- `pnpm --filter web dev`
- Point at deployed Arb Sepolia addresses via `.env.local` (no localhost chain — Nox TEE requires a live testnet)

### 7.3 Conventions
- TypeScript strict, no `any`
- Solidity ^0.8.24, NatSpec on every external function
- Conventional commits (`feat:`, `fix:`, `chore:`)
- One feature = one PR-sized commit, even though we're not using PRs
- All amounts in contract are `uint64` (fits 18.4 trillion units of 6-decimal USDC — enough)
- Never log or console.log plaintext amounts
- Env vars validated via Zod at boot; app refuses to start on missing keys

### 7.4 Testing
- Unit tests for Payroll access control, employee CRUD, payAll loop bounds
- Integration test against a forked Arb Sepolia with real cUSDC
- No test uses mocked Nox behavior — integration must hit the real TEE path (challenge requirement: no mock data end-to-end)

### 7.5 Deployment targets
- **Contracts:** Arbitrum Sepolia (chainId 421614)
- **Frontend:** Vercel
- **Env needed:** `ARB_SEPOLIA_RPC`, `DEPLOYER_PK`, `NEXT_PUBLIC_PAYROLL_ADDR`, `NEXT_PUBLIC_CUSDC_ADDR`, `NEXT_PUBLIC_USDC_ADDR`, `CHAINGPT_API_KEY`, `NEXT_PUBLIC_NOX_ENV`

---

## 8. Key references

- Nox docs: https://docs.iex.ec/nox-protocol/getting-started/welcome
- Nox npm org: https://www.npmjs.com/org/iexec-nox
- Confidential contract wizard: https://cdefi-wizard.iex.ec/
- Confidential Token demo + faucet: https://cdefi.iex.ec/
- iExec dev linktree: https://linktr.ee/iexec.tech
- ChainGPT: https://chaingpt.org
- ERC-7984 spec: read before writing any cToken code
- ERC-20 / ERC-2612 (permit) for USDC mock

---

## 9. Open technical questions (resolve early)

- Exact `euint` type width supported by current Nox release (`euint32` vs `euint64`) — affects salary cap
- Whether `confidentialTransfer` batches atomically in one tx or needs a helper — determines `payAll` implementation
- Decryption request latency — impacts employee UX, may need optimistic UI
- Gas cost of a single confidential transfer on Arb Sepolia — sizes the `payAll` loop cap
- ChainGPT audit API rate limits and output format — determines how we render the report

Resolve these by reading Nox docs + asking in the iExec Discord Vibe Coding channel before writing production code.

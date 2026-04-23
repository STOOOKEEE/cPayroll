"use client";

import { useState } from "react";
import { generatePrivateKey, privateKeyToAccount } from "viem/accounts";
import { useAccount, usePublicClient, useWalletClient, useWriteContract } from "wagmi";
import { Banner } from "@/components/ui/banner";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { addresses, isDeployed, payrollAbi, usdcAbi } from "@/lib/contracts";
import { arbiscanTx, truncateAddress, truncateHandle } from "@/lib/format";
import { encryptAmount } from "@/lib/nox";

type Step = {
  key: string;
  label: string;
  status: "idle" | "running" | "done" | "error";
  detail?: string;
};

const INITIAL_STEPS: Step[] = [
  { key: "mint", label: "MINT_10K_USDC_TO_OWNER", status: "idle" },
  { key: "approve", label: "APPROVE_PAYROLL_5K_USDC", status: "idle" },
  { key: "deposit", label: "DEPOSIT_5K_INTO_PAYROLL", status: "idle" },
  { key: "emp1", label: "ADD_EMPLOYEE_1 — 3000_USDC", status: "idle" },
  { key: "emp2", label: "ADD_EMPLOYEE_2 — 5000_USDC", status: "idle" },
  { key: "emp3", label: "ADD_EMPLOYEE_3 — 7500_USDC", status: "idle" },
  { key: "payall", label: "PAY_ALL", status: "idle" },
];

const FIXTURE = [
  { salary: 3000n * 1_000_000n, position: "CORE_DEVELOPER" },
  { salary: 5000n * 1_000_000n, position: "DAO_OPERATIONS" },
  { salary: 7500n * 1_000_000n, position: "SECURITY_AUDIT" },
];

export default function SeedPage() {
  const { address, isConnected } = useAccount();
  const publicClient = usePublicClient();
  const { data: walletClient } = useWalletClient();
  const { writeContractAsync } = useWriteContract();

  const [steps, setSteps] = useState<Step[]>(INITIAL_STEPS);
  const [running, setRunning] = useState(false);
  const [globalError, setGlobalError] = useState<string | null>(null);
  const [empAddrs, setEmpAddrs] = useState<`0x${string}`[]>([]);

  const deployed = isDeployed();

  function updateStep(key: string, patch: Partial<Step>) {
    setSteps((prev) =>
      prev.map((s) => (s.key === key ? { ...s, ...patch } : s))
    );
  }

  async function runStep<T>(
    key: string,
    fn: () => Promise<T>
  ): Promise<T | null> {
    updateStep(key, { status: "running", detail: undefined });
    try {
      const out = await fn();
      updateStep(key, { status: "done" });
      return out;
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      updateStep(key, { status: "error", detail: msg });
      throw e;
    }
  }

  async function wait(hash: `0x${string}`) {
    if (!publicClient) return;
    await publicClient.waitForTransactionReceipt({ hash });
  }

  async function onRunAll() {
    setGlobalError(null);
    setRunning(true);
    setSteps(INITIAL_STEPS);
    setEmpAddrs([]);

    if (!address || !walletClient) {
      setGlobalError("WALLET_NOT_CONNECTED");
      setRunning(false);
      return;
    }

    const generated: `0x${string}`[] = [];

    try {
      // 1. Mint 10k USDC to the connected wallet
      await runStep("mint", async () => {
        const hash = await writeContractAsync({
          address: addresses.usdc,
          abi: usdcAbi,
          functionName: "mint",
          args: [address, 10_000n * 1_000_000n],
        });
        updateStep("mint", { detail: hash });
        await wait(hash);
      });

      // 2. Approve Payroll to pull 5k
      await runStep("approve", async () => {
        const hash = await writeContractAsync({
          address: addresses.usdc,
          abi: usdcAbi,
          functionName: "approve",
          args: [addresses.payroll, 5_000n * 1_000_000n],
        });
        updateStep("approve", { detail: hash });
        await wait(hash);
      });

      // 3. Deposit 5k — pulls USDC + wraps into cUSDC
      await runStep("deposit", async () => {
        const hash = await writeContractAsync({
          address: addresses.payroll,
          abi: payrollAbi,
          functionName: "deposit",
          args: [5_000n * 1_000_000n],
        });
        updateStep("deposit", { detail: hash });
        await wait(hash);
      });

      // 4. Add 3 employees with encrypted salaries
      for (let i = 0; i < 3; i++) {
        const stepKey = `emp${i + 1}`;
        await runStep(stepKey, async () => {
          const newAcct = privateKeyToAccount(generatePrivateKey());
          generated.push(newAcct.address);
          setEmpAddrs([...generated]);

          const { handle, handleProof } = await encryptAmount(
            walletClient,
            FIXTURE[i].salary,
            addresses.payroll
          );
          const hash = await writeContractAsync({
            address: addresses.payroll,
            abi: payrollAbi,
            functionName: "addEmployee",
            args: [newAcct.address, handle, handleProof],
          });
          updateStep(stepKey, {
            detail: `${truncateAddress(newAcct.address)} → ${truncateHandle(hash)}`,
          });
          await wait(hash);
        });
      }

      // 5. payAll — confidential transfer to each
      await runStep("payall", async () => {
        const hash = await writeContractAsync({
          address: addresses.payroll,
          abi: payrollAbi,
          functionName: "payAll",
        });
        updateStep("payall", { detail: hash });
        await wait(hash);
      });
    } catch (e) {
      setGlobalError(e instanceof Error ? e.message : String(e));
    } finally {
      setRunning(false);
    }
  }

  return (
    <div className="p-8 space-y-6 max-w-4xl mx-auto">
      <header>
        <h1 className="text-[20px] uppercase tracking-wider2 text-fg font-medium">
          SEED_DEMO_ROSTER
        </h1>
        <p className="label-mono mt-1">
          POPULATES PAYROLL WITH 3 RANDOM EMPLOYEES + 5K USDC TREASURY
        </p>
      </header>

      <Banner tone="warning">
        OWNER_ONLY • BURNS ARB_SEPOLIA ETH • GENERATES NEW TEST ACCOUNTS (UNCONTROLLED)
      </Banner>

      <Card label="PIPELINE">
        <ul className="space-y-2 text-[12px]">
          {steps.map((s) => (
            <li key={s.key} className="flex items-start gap-3">
              <span
                className={`w-3 h-3 mt-[5px] shrink-0 ${
                  s.status === "done"
                    ? "bg-accent"
                    : s.status === "running"
                      ? "bg-fg animate-pulse"
                      : s.status === "error"
                        ? "bg-accent-hover"
                        : "bg-border"
                }`}
              />
              <div className="flex-1">
                <div className="label-mono-fg">
                  {s.label}{" "}
                  <span className="text-dim">
                    [{s.status.toUpperCase()}]
                  </span>
                </div>
                {s.detail && (
                  <div className="label-mono break-all mt-1">
                    {s.detail.startsWith("0x") ? (
                      <a
                        href={arbiscanTx(s.detail as `0x${string}`)}
                        target="_blank"
                        rel="noreferrer"
                        className="hover:text-fg"
                      >
                        &gt; TX: {truncateHandle(s.detail)}
                      </a>
                    ) : (
                      <span>&gt; {s.detail}</span>
                    )}
                  </div>
                )}
              </div>
            </li>
          ))}
        </ul>

        <div className="mt-6 flex gap-3">
          <Button
            onClick={onRunAll}
            disabled={!deployed || !isConnected || running}
          >
            {running ? "SEEDING…" : "RUN_FULL_SEED"}
          </Button>
          <Button
            variant="secondary"
            onClick={() => {
              setSteps(INITIAL_STEPS);
              setEmpAddrs([]);
              setGlobalError(null);
            }}
            disabled={running}
          >
            RESET_PIPELINE
          </Button>
        </div>

        {globalError && (
          <p className="mt-4 label-mono text-accent break-all">
            ! {globalError}
          </p>
        )}
      </Card>

      {empAddrs.length > 0 && (
        <Card label="GENERATED_EMPLOYEE_ACCOUNTS">
          <ul className="space-y-1 text-[11px]">
            {empAddrs.map((a, i) => (
              <li key={a} className="flex gap-3">
                <span className="label-mono w-8">#{i + 1}</span>
                <span className="hex">{a.toUpperCase()}</span>
              </li>
            ))}
          </ul>
          <p className="label-mono-fade mt-4">
            PRIVATE_KEYS_DISCARDED • EMPLOYEES CANNOT SIGN FROM THESE ADDRS
          </p>
        </Card>
      )}
    </div>
  );
}

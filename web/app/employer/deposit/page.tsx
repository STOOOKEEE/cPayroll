"use client";

import Link from "next/link";
import { useState } from "react";
import { useAccount, useWriteContract } from "wagmi";
import { ConnectButton } from "@/components/connect-button";
import { Banner } from "@/components/ui/banner";
import { Button } from "@/components/ui/button";
import { Card, CardTitle } from "@/components/ui/card";
import { addresses, isDeployed, payrollAbi, usdcAbi } from "@/lib/contracts";
import { arbiscanTx, parseUsdc, truncateHandle } from "@/lib/format";

type Step = "idle" | "approving" | "approved" | "depositing" | "done";

export default function DepositPage() {
  const { address: account, isConnected } = useAccount();
  const { writeContractAsync } = useWriteContract();
  const [amount, setAmount] = useState("100");
  const [step, setStep] = useState<Step>("idle");
  const [txHash, setTxHash] = useState<`0x${string}` | null>(null);
  const [error, setError] = useState<string | null>(null);

  const deployed = isDeployed();

  async function onApprove() {
    setError(null);
    setTxHash(null);
    try {
      const value = parseUsdc(amount);
      setStep("approving");
      const hash = await writeContractAsync({
        address: addresses.usdc,
        abi: usdcAbi,
        functionName: "approve",
        args: [addresses.payroll, value],
      });
      setTxHash(hash);
      setStep("approved");
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
      setStep("idle");
    }
  }

  async function onDeposit() {
    setError(null);
    try {
      const value = parseUsdc(amount);
      setStep("depositing");
      const hash = await writeContractAsync({
        address: addresses.payroll,
        abi: payrollAbi,
        functionName: "deposit",
        args: [value],
      });
      setTxHash(hash);
      setStep("done");
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
      setStep("approved");
    }
  }

  async function onMint() {
    if (!account) return;
    setError(null);
    try {
      const hash = await writeContractAsync({
        address: addresses.usdc,
        abi: usdcAbi,
        functionName: "mint",
        args: [account, 1000_000000n],
      });
      setTxHash(hash);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    }
  }

  return (
    <main className="p-8 space-y-6 max-w-2xl mx-auto">
      <header className="flex items-center justify-between">
        <h1 className="text-3xl font-bold">Deposit &amp; wrap</h1>
        <ConnectButton />
      </header>
      <Link className="text-sm underline" href="/employer">← Back to dashboard</Link>

      {!deployed && (
        <Banner tone="warning">Contracts not deployed yet.</Banner>
      )}

      <Card>
        <CardTitle>1. Approve USDC</CardTitle>
        <label className="block text-sm text-neutral-400 mb-2">Amount (USDC)</label>
        <input
          className="w-full rounded-md bg-neutral-900 border border-neutral-800 px-3 py-2 mb-3 font-mono"
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
        />
        <Button onClick={onApprove} disabled={!deployed || !isConnected || step === "approving"}>
          {step === "approving" ? "Approving…" : "Approve"}
        </Button>
      </Card>

      <Card>
        <CardTitle>2. Deposit &amp; wrap into cUSDC</CardTitle>
        <Button
          onClick={onDeposit}
          disabled={!deployed || step === "idle" || step === "approving" || step === "depositing"}
        >
          {step === "depositing" ? "Depositing…" : "Deposit"}
        </Button>
        {step === "done" && (
          <p className="mt-3 text-sm text-emerald-400">Deposit confirmed.</p>
        )}
      </Card>

      <Card>
        <CardTitle>Dev helper</CardTitle>
        <p className="text-sm text-neutral-400 mb-3">Mint 1000 test USDC to your wallet.</p>
        <Button variant="secondary" onClick={onMint} disabled={!deployed || !isConnected}>
          Mint 1000 USDC
        </Button>
      </Card>

      {txHash && (
        <p className="text-sm">
          Last tx:{" "}
          <a className="underline font-mono" href={arbiscanTx(txHash)} target="_blank" rel="noreferrer">
            {truncateHandle(txHash)}
          </a>
        </p>
      )}
      {error && <p className="text-sm text-red-400">{error}</p>}
    </main>
  );
}

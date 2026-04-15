"use client";

import Link from "next/link";
import { useState } from "react";
import { isAddress } from "viem";
import { useAccount, useWalletClient, useWriteContract } from "wagmi";
import { ConnectButton } from "@/components/connect-button";
import { Banner } from "@/components/ui/banner";
import { Button } from "@/components/ui/button";
import { Card, CardTitle } from "@/components/ui/card";
import { addresses, isDeployed, payrollAbi } from "@/lib/contracts";
import { arbiscanTx, parseUsdc, truncateHandle } from "@/lib/format";
import { encryptAmount } from "@/lib/nox";

type Phase = "idle" | "encrypting" | "submitting" | "done";

export default function EmployeesPage() {
  const { isConnected } = useAccount();
  const { data: walletClient } = useWalletClient();
  const { writeContractAsync } = useWriteContract();
  const [empAddr, setEmpAddr] = useState("");
  const [salary, setSalary] = useState("");
  const [phase, setPhase] = useState<Phase>("idle");
  const [txHash, setTxHash] = useState<`0x${string}` | null>(null);
  const [error, setError] = useState<string | null>(null);

  const deployed = isDeployed();

  async function onAdd(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setTxHash(null);

    if (!walletClient) {
      setError("Wallet not ready");
      return;
    }
    if (!isAddress(empAddr)) {
      setError("Invalid employee address");
      return;
    }

    let salaryBig: bigint;
    try {
      salaryBig = parseUsdc(salary);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
      return;
    }

    try {
      setPhase("encrypting");
      const { handle, handleProof } = await encryptAmount(
        walletClient,
        salaryBig,
        addresses.payroll
      );
      // Clear plaintext salary from state immediately after encryption.
      setSalary("");
      salaryBig = 0n;

      setPhase("submitting");
      const hash = await writeContractAsync({
        address: addresses.payroll,
        abi: payrollAbi,
        functionName: "addEmployee",
        args: [empAddr as `0x${string}`, handle, handleProof],
      });
      setTxHash(hash);
      setPhase("done");
      setEmpAddr("");
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
      setPhase("idle");
    }
  }

  return (
    <main className="p-8 space-y-6 max-w-2xl mx-auto">
      <header className="flex items-center justify-between">
        <h1 className="text-3xl font-bold">Employees</h1>
        <ConnectButton />
      </header>
      <Link className="text-sm underline" href="/employer">← Back to dashboard</Link>

      {!deployed && <Banner tone="warning">Contracts not deployed yet.</Banner>}

      <Card>
        <CardTitle>Add employee</CardTitle>
        <form onSubmit={onAdd} className="space-y-3">
          <div>
            <label className="block text-sm text-neutral-400 mb-1">Employee address</label>
            <input
              className="w-full rounded-md bg-neutral-900 border border-neutral-800 px-3 py-2 font-mono text-sm"
              value={empAddr}
              onChange={(ev) => setEmpAddr(ev.target.value)}
              placeholder="0x…"
            />
          </div>
          <div>
            <label className="block text-sm text-neutral-400 mb-1">
              Salary (USDC, encrypted on submit)
            </label>
            <input
              className="w-full rounded-md bg-neutral-900 border border-neutral-800 px-3 py-2 font-mono text-sm"
              value={salary}
              onChange={(ev) => setSalary(ev.target.value)}
              placeholder="1000"
              inputMode="decimal"
            />
            <p className="text-xs text-neutral-500 mt-1">
              Cleared from memory immediately after encryption.
            </p>
          </div>
          <Button
            type="submit"
            disabled={
              !deployed || !isConnected || phase === "encrypting" || phase === "submitting"
            }
          >
            {phase === "encrypting"
              ? "Encrypting…"
              : phase === "submitting"
                ? "Submitting…"
                : "Add employee"}
          </Button>
        </form>

        {phase === "done" && (
          <p className="mt-3 text-sm text-emerald-400">Employee added.</p>
        )}
        {txHash && (
          <p className="mt-3 text-sm">
            Tx:{" "}
            <a className="underline font-mono" href={arbiscanTx(txHash)} target="_blank" rel="noreferrer">
              {truncateHandle(txHash)}
            </a>
          </p>
        )}
        {error && <p className="mt-3 text-sm text-red-400">{error}</p>}
      </Card>

      <Card>
        <CardTitle>Manage</CardTitle>
        <p className="text-sm text-neutral-400">
          The employee list and remove buttons live on the{" "}
          <Link href="/employer" className="underline">
            dashboard
          </Link>
          .
        </p>
      </Card>
    </main>
  );
}

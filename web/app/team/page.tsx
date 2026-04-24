"use client";

import { useState } from "react";
import { isAddress } from "viem";
import { useAccount, useWalletClient, useWriteContract } from "wagmi";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { EmployeeTable } from "@/components/dashboard/employee-table";
import { isDeployed, payrollAbi } from "@/lib/contracts";
import { arbiscanTx, parseUsdc, truncateHandle } from "@/lib/format";
import { encryptAmount } from "@/lib/nox";
import { useActivePayroll } from "@/lib/active-payroll";

type Phase = "idle" | "encrypting" | "submitting" | "done";

export default function TeamPage() {
  const { isConnected } = useAccount();
  const { data: walletClient } = useWalletClient();
  const { writeContractAsync } = useWriteContract();
  const { address: payroll } = useActivePayroll();
  const [empAddr, setEmpAddr] = useState("");
  const [salary, setSalary] = useState("");
  const [phase, setPhase] = useState<Phase>("idle");
  const [txHash, setTxHash] = useState<`0x${string}` | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [reloadKey, setReloadKey] = useState(0);

  const deployed = isDeployed();

  async function onAdd(e: React.FormEvent) {
    e.preventDefault();
    setErr(null);
    setTxHash(null);

    if (!walletClient) {
      setErr("WALLET_NOT_READY");
      return;
    }
    if (!isAddress(empAddr)) {
      setErr("INVALID_ADDRESS");
      return;
    }

    let salaryBig: bigint;
    try {
      salaryBig = parseUsdc(salary);
    } catch (e) {
      setErr(e instanceof Error ? e.message.toUpperCase() : String(e));
      return;
    }

    try {
      setPhase("encrypting");
      const { handle, handleProof } = await encryptAmount(
        walletClient,
        salaryBig,
        payroll
      );
      setSalary("");
      salaryBig = 0n;

      setPhase("submitting");
      const hash = await writeContractAsync({
        address: payroll,
        abi: payrollAbi,
        functionName: "addEmployee",
        args: [empAddr as `0x${string}`, handle, handleProof],
      });
      setTxHash(hash);
      setPhase("done");
      setEmpAddr("");
      setReloadKey((k) => k + 1);
    } catch (e) {
      setErr(e instanceof Error ? e.message.toUpperCase() : String(e));
      setPhase("idle");
    }
  }

  return (
    <div className="p-8 space-y-6 max-w-6xl mx-auto">
      <header>
        <h1 className="text-[20px] uppercase tracking-wider2 text-fg font-medium">
          TEAM_MANAGEMENT
        </h1>
        <p className="label-mono mt-1">ADD, REMOVE, AND ROTATE ENCRYPTED SALARIES</p>
      </header>

      <div className="grid grid-cols-3 gap-6">
        <Card label="ADD_EMPLOYEE" className="col-span-1">
          <form onSubmit={onAdd} className="space-y-4">
            <div>
              <label className="label-mono block mb-2">ADDRESS</label>
              <input
                className="w-full bg-bg border border-border px-3 py-2 font-mono text-[12px] focus:outline-none focus:border-accent"
                value={empAddr}
                onChange={(e) => setEmpAddr(e.target.value)}
                placeholder="0x…"
              />
            </div>
            <div>
              <label className="label-mono block mb-2">SALARY_USDC_MNTHLY</label>
              <input
                className="w-full bg-bg border border-border px-3 py-2 font-mono text-[12px] focus:outline-none focus:border-accent"
                value={salary}
                onChange={(e) => setSalary(e.target.value)}
                placeholder="1000"
                inputMode="decimal"
              />
              <p className="label-mono-fade mt-2">
                CLEARED_FROM_MEMORY_AFTER_ENCRYPTION
              </p>
            </div>
            <Button
              className="w-full"
              type="submit"
              disabled={
                !deployed ||
                !isConnected ||
                phase === "encrypting" ||
                phase === "submitting"
              }
            >
              {phase === "encrypting"
                ? "ENCRYPTING…"
                : phase === "submitting"
                  ? "SUBMITTING…"
                  : "+ ADD_EMPLOYEE"}
            </Button>

            {phase === "done" && (
              <p className="label-mono text-accent">&gt; EMPLOYEE_REGISTERED</p>
            )}
            {txHash && (
              <a
                href={arbiscanTx(txHash)}
                target="_blank"
                rel="noreferrer"
                className="block label-mono hover:text-fg truncate"
              >
                &gt; TX: {truncateHandle(txHash)}
              </a>
            )}
            {err && <p className="label-mono text-accent break-all">! {err}</p>}
          </form>
        </Card>

        <div className="col-span-2">
          <Card label="ACTIVE_PERSONNEL">
            <EmployeeTable key={reloadKey} showRemove />
          </Card>
        </div>
      </div>
    </div>
  );
}

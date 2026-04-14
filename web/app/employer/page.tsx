"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { useAccount, usePublicClient, useReadContract, useWriteContract } from "wagmi";
import { ConnectButton } from "@/components/connect-button";
import { Banner } from "@/components/ui/banner";
import { Button } from "@/components/ui/button";
import { Card, CardTitle } from "@/components/ui/card";
import { Modal, AuditReportBody, type AuditReportView } from "@/components/ui/modal";
import { Table, TBody, TD, TH, THead, TR } from "@/components/ui/table";
import { addresses, cUSDCAbi, isDeployed, payrollAbi, usdcAbi } from "@/lib/contracts";
import {
  arbiscanAddress,
  arbiscanTx,
  formatTimestamp,
  formatUsdc,
  truncateAddress,
  truncateHandle,
} from "@/lib/format";

type Employee = { addr: `0x${string}`; lastPaid: bigint };

export default function EmployerDashboard() {
  const { address: account, isConnected } = useAccount();
  const publicClient = usePublicClient();
  const { writeContractAsync, isPending } = useWriteContract();
  const [txHash, setTxHash] = useState<`0x${string}` | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [employees, setEmployees] = useState<Employee[] | null>(null);
  const [loadingEmployees, setLoadingEmployees] = useState(false);
  const [auditReport, setAuditReport] = useState<AuditReportView | null>(null);
  const [auditOpen, setAuditOpen] = useState(false);
  const [auditLoading, setAuditLoading] = useState(false);

  async function onAudit() {
    setError(null);
    setAuditLoading(true);
    setAuditOpen(true);
    setAuditReport(null);
    try {
      const res = await fetch("/api/chaingpt/audit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ contractName: "Payroll" }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? "Audit failed");
      setAuditReport(json.report as AuditReportView);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
      setAuditOpen(false);
    } finally {
      setAuditLoading(false);
    }
  }

  const deployed = isDeployed();

  const treasuryUsdc = useReadContract({
    address: deployed ? addresses.usdc : undefined,
    abi: usdcAbi,
    functionName: "balanceOf",
    args: deployed ? [addresses.payroll] : undefined,
    query: { enabled: deployed },
  });

  const treasuryHandle = useReadContract({
    address: deployed ? addresses.cUSDC : undefined,
    abi: cUSDCAbi,
    functionName: "confidentialBalanceOf",
    args: deployed ? [addresses.payroll] : undefined,
    query: { enabled: deployed },
  });

  const employeeCount = useReadContract({
    address: deployed ? addresses.payroll : undefined,
    abi: payrollAbi,
    functionName: "employeeCount",
    query: { enabled: deployed },
  });

  const count = useMemo(
    () => (typeof employeeCount.data === "bigint" ? employeeCount.data : 0n),
    [employeeCount.data]
  );

  async function loadEmployees() {
    if (!publicClient || !deployed) return;
    setLoadingEmployees(true);
    try {
      const list: Employee[] = [];
      for (let i = 0n; i < count; i++) {
        const addr = (await publicClient.readContract({
          address: addresses.payroll,
          abi: payrollAbi,
          functionName: "employeeList",
          args: [i],
        })) as `0x${string}`;
        const data = (await publicClient.readContract({
          address: addresses.payroll,
          abi: payrollAbi,
          functionName: "employees",
          args: [addr],
        })) as readonly [boolean, `0x${string}`, bigint, bigint];
        list.push({ addr, lastPaid: data[2] });
      }
      setEmployees(list);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setLoadingEmployees(false);
    }
  }

  async function onPayAll() {
    setError(null);
    setTxHash(null);
    try {
      const hash = await writeContractAsync({
        address: addresses.payroll,
        abi: payrollAbi,
        functionName: "payAll",
      });
      setTxHash(hash);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    }
  }

  async function onRemove(addr: `0x${string}`) {
    setError(null);
    setTxHash(null);
    try {
      const hash = await writeContractAsync({
        address: addresses.payroll,
        abi: payrollAbi,
        functionName: "removeEmployee",
        args: [addr],
      });
      setTxHash(hash);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    }
  }

  return (
    <main className="p-8 space-y-6 max-w-5xl mx-auto">
      <header className="flex items-center justify-between">
        <h1 className="text-3xl font-bold">Employer dashboard</h1>
        <ConnectButton />
      </header>

      <nav className="flex gap-3 text-sm">
        <Link className="underline" href="/employer/deposit">Deposit</Link>
        <Link className="underline" href="/employer/employees">Manage employees</Link>
        <Link className="underline" href="/employee">Employee view</Link>
      </nav>

      {!deployed && (
        <Banner tone="warning">
          Contracts not deployed yet. Set NEXT_PUBLIC_PAYROLL_ADDR / CUSDC / USDC in your env.
        </Banner>
      )}

      {!isConnected && <Banner tone="info">Connect a wallet to interact.</Banner>}

      <Card>
        <CardTitle>Treasury</CardTitle>
        <div className="space-y-2 text-sm">
          <div>
            <span className="text-neutral-400">Plain USDC held by Payroll: </span>
            <span className="font-mono">
              {treasuryUsdc.data !== undefined
                ? `${formatUsdc(treasuryUsdc.data as bigint)} USDC`
                : "—"}
            </span>
          </div>
          <div>
            <span className="text-neutral-400">cUSDC encrypted handle: </span>
            <span className="font-mono">
              {treasuryHandle.data
                ? truncateHandle(treasuryHandle.data as string)
                : "—"}
            </span>
            <span className="text-neutral-500"> (not decrypted)</span>
          </div>
        </div>
      </Card>

      <Card>
        <div className="flex items-center justify-between mb-3">
          <CardTitle>Employees ({count.toString()})</CardTitle>
          <Button
            variant="secondary"
            onClick={loadEmployees}
            disabled={!deployed || loadingEmployees}
          >
            {loadingEmployees ? "Loading…" : "Load"}
          </Button>
        </div>
        {employees && employees.length > 0 ? (
          <Table>
            <THead>
              <TR>
                <TH>Address</TH>
                <TH>Last paid</TH>
                <TH>Actions</TH>
              </TR>
            </THead>
            <TBody>
              {employees.map((e) => (
                <TR key={e.addr}>
                  <TD>
                    <a
                      className="underline font-mono"
                      href={arbiscanAddress(e.addr)}
                      target="_blank"
                      rel="noreferrer"
                    >
                      {truncateAddress(e.addr)}
                    </a>
                  </TD>
                  <TD>{formatTimestamp(e.lastPaid)}</TD>
                  <TD>
                    <Button
                      variant="danger"
                      onClick={() => onRemove(e.addr)}
                      disabled={isPending}
                    >
                      Remove
                    </Button>
                  </TD>
                </TR>
              ))}
            </TBody>
          </Table>
        ) : (
          <p className="text-sm text-neutral-500">
            {employees ? "No employees yet." : "Click Load to fetch the employee list."}
          </p>
        )}
      </Card>

      <Card>
        <CardTitle>Actions</CardTitle>
        <div className="flex gap-3">
          <Button onClick={onPayAll} disabled={!deployed || !isConnected || isPending}>
            {isPending ? "Submitting…" : "Pay All"}
          </Button>
          <Button
            variant="secondary"
            onClick={onAudit}
            disabled={auditLoading}
          >
            {auditLoading ? "Auditing…" : "AI Audit"}
          </Button>
        </div>
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

      {account && (
        <p className="text-xs text-neutral-500">Connected: {truncateAddress(account)}</p>
      )}

      <Modal
        open={auditOpen}
        onClose={() => setAuditOpen(false)}
        title="ChainGPT Smart Contract Audit — Payroll.sol"
      >
        {auditLoading || !auditReport ? (
          <p className="text-sm text-neutral-400">Running audit…</p>
        ) : (
          <AuditReportBody report={auditReport} />
        )}
      </Modal>
    </main>
  );
}

"use client";

import { useState } from "react";
import {
  useAccount,
  useReadContract,
  useWalletClient,
  useWriteContract,
} from "wagmi";
import { Banner } from "@/components/ui/banner";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Modal, AuditReportBody, type AuditReportView } from "@/components/ui/modal";
import { addresses, cUSDCAbi, isDeployed, payrollAbi, usdcAbi } from "@/lib/contracts";
import { useActivePayroll } from "@/lib/active-payroll";
import {
  arbiscanTx,
  formatUsdc,
  parseUsdc,
  truncateHandle,
} from "@/lib/format";
import { encryptAmount } from "@/lib/nox";

type Step = "idle" | "approving" | "approved" | "depositing" | "done";
type Phase = "idle" | "encrypting" | "submitting" | "pending";

export default function TreasuryPage() {
  const { isConnected } = useAccount();
  const { data: walletClient } = useWalletClient();
  const { writeContractAsync } = useWriteContract();
  const { address: payroll } = useActivePayroll();
  const deployed = isDeployed();

  const [amount, setAmount] = useState("100");
  const [step, setStep] = useState<Step>("idle");
  const [depositTx, setDepositTx] = useState<`0x${string}` | null>(null);
  const [err, setErr] = useState<string | null>(null);

  const [withdrawAmount, setWithdrawAmount] = useState("");
  const [withdrawPhase, setWithdrawPhase] = useState<Phase>("idle");
  const [withdrawTx, setWithdrawTx] = useState<`0x${string}` | null>(null);

  const [auditReport, setAuditReport] = useState<AuditReportView | null>(null);
  const [auditOpen, setAuditOpen] = useState(false);
  const [auditLoading, setAuditLoading] = useState(false);

  const treasuryUsdc = useReadContract({
    address: deployed ? addresses.usdc : undefined,
    abi: usdcAbi,
    functionName: "balanceOf",
    args: deployed ? [payroll] : undefined,
    query: { enabled: deployed },
  });
  const treasuryHandle = useReadContract({
    address: deployed ? addresses.cUSDC : undefined,
    abi: cUSDCAbi,
    functionName: "confidentialBalanceOf",
    args: deployed ? [payroll] : undefined,
    query: { enabled: deployed },
  });
  const withdrawPending = useReadContract({
    address: deployed ? payroll : undefined,
    abi: payrollAbi,
    functionName: "withdrawPending",
    query: { enabled: deployed },
  });

  async function onApprove() {
    setErr(null);
    try {
      const value = parseUsdc(amount);
      setStep("approving");
      await writeContractAsync({
        address: addresses.usdc,
        abi: usdcAbi,
        functionName: "approve",
        args: [payroll, value],
      });
      setStep("approved");
    } catch (e) {
      setErr(e instanceof Error ? e.message.toUpperCase() : String(e));
      setStep("idle");
    }
  }

  async function onDeposit() {
    setErr(null);
    try {
      const value = parseUsdc(amount);
      setStep("depositing");
      const hash = await writeContractAsync({
        address: payroll,
        abi: payrollAbi,
        functionName: "deposit",
        args: [value],
      });
      setDepositTx(hash);
      setStep("done");
      treasuryUsdc.refetch();
      treasuryHandle.refetch();
    } catch (e) {
      setErr(e instanceof Error ? e.message.toUpperCase() : String(e));
      setStep("approved");
    }
  }

async function onWithdraw(e: React.FormEvent) {
    e.preventDefault();
    setErr(null);
    setWithdrawTx(null);
    if (!walletClient) {
      setErr("WALLET_NOT_READY");
      return;
    }
    let amountBig: bigint;
    try {
      amountBig = parseUsdc(withdrawAmount);
    } catch (e) {
      setErr(e instanceof Error ? e.message.toUpperCase() : String(e));
      return;
    }
    try {
      setWithdrawPhase("encrypting");
      const { handle, handleProof } = await encryptAmount(
        walletClient,
        amountBig,
        payroll
      );
      setWithdrawAmount("");
      amountBig = 0n;

      setWithdrawPhase("submitting");
      const hash = await writeContractAsync({
        address: payroll,
        abi: payrollAbi,
        functionName: "withdrawUnderlying",
        args: [handle, handleProof],
      });
      setWithdrawTx(hash);
      setWithdrawPhase("pending");
      withdrawPending.refetch();
    } catch (e) {
      setErr(e instanceof Error ? e.message.toUpperCase() : String(e));
      setWithdrawPhase("idle");
    }
  }

  async function onClearPending() {
    setErr(null);
    try {
      await writeContractAsync({
        address: payroll,
        abi: payrollAbi,
        functionName: "clearWithdrawPending",
      });
      setWithdrawPhase("idle");
      withdrawPending.refetch();
    } catch (e) {
      setErr(e instanceof Error ? e.message.toUpperCase() : String(e));
    }
  }

  async function onAudit() {
    setErr(null);
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
      if (!res.ok) throw new Error(json.error ?? "AUDIT_FAILED");
      setAuditReport(json.report as AuditReportView);
    } catch (e) {
      setErr(e instanceof Error ? e.message.toUpperCase() : String(e));
      setAuditOpen(false);
    } finally {
      setAuditLoading(false);
    }
  }

  return (
    <div className="p-8 space-y-6 max-w-6xl mx-auto">
      <header>
        <h1 className="text-[20px] uppercase tracking-wider2 text-fg font-medium">
          TREASURY_OPERATIONS
        </h1>
        <p className="label-mono mt-1">WRAP, UNWRAP, AUDIT, AND MONITOR FUNDS</p>
      </header>

      {!isConnected && (
        <Banner tone="info">
          CONNECT_WALLET_TO_ENABLE_ACTIONS
        </Banner>
      )}

      {withdrawPending.data === true && (
        <Banner tone="warning">
          UNWRAP_IN_FLIGHT — PAYROLL LOCKED UNTIL CLEAR_PENDING
        </Banner>
      )}

      <div className="grid grid-cols-2 gap-6">
        <Card label="BALANCE_UNENCRYPTED">
          <div className="text-[28px] font-medium tabular-nums leading-tight">
            {treasuryUsdc.data !== undefined
              ? formatUsdc(treasuryUsdc.data as bigint)
              : "—"}
          </div>
          <span className="label-mono">USDC HELD BY PAYROLL</span>
        </Card>

        <Card label="BALANCE_ENCRYPTED">
          <div className="text-[15px] font-mono text-accent break-all leading-tight">
            {treasuryHandle.data
              ? truncateHandle(treasuryHandle.data as string).toUpperCase()
              : "—"}
          </div>
          <span className="label-mono">CUSDC HANDLE (NOT DECRYPTED)</span>
        </Card>
      </div>

      <div className="grid grid-cols-2 gap-6">
        <Card label="DEPOSIT / WRAP_TO_CUSDC">
          <label className="label-mono block mb-2">AMOUNT_USDC</label>
          <input
            className="w-full bg-bg border border-border px-3 py-2 font-mono text-[12px] focus:outline-none focus:border-accent mb-4"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
          />
          <div className="flex gap-2">
            <Button
              onClick={onApprove}
              variant="secondary"
              disabled={!deployed || !isConnected || step === "approving"}
            >
              {step === "approving" ? "APPROVING…" : "1. APPROVE"}
            </Button>
            <Button
              onClick={onDeposit}
              disabled={
                !deployed ||
                step === "idle" ||
                step === "approving" ||
                step === "depositing"
              }
            >
              {step === "depositing" ? "DEPOSITING…" : "2. DEPOSIT"}
            </Button>
          </div>
          {step === "done" && (
            <p className="mt-3 label-mono text-accent">&gt; DEPOSIT_CONFIRMED</p>
          )}
          {depositTx && (
            <a
              href={arbiscanTx(depositTx)}
              target="_blank"
              rel="noreferrer"
              className="block mt-2 label-mono hover:text-fg truncate"
            >
              &gt; TX: {truncateHandle(depositTx)}
            </a>
          )}
          <div className="mt-6 pt-4 border-t border-border">
            <p className="label-mono-fade mb-2">NEED_TESTNET_USDC</p>
            <a
              href="https://faucet.circle.com"
              target="_blank"
              rel="noreferrer"
              className="label-mono-fg hover:text-accent underline"
            >
              &gt; FAUCET.CIRCLE.COM
            </a>
          </div>
        </Card>

        <Card label="EMERGENCY_WITHDRAW">
          <form onSubmit={onWithdraw} className="space-y-3">
            <label className="label-mono block">AMOUNT_USDC (ENCRYPTED)</label>
            <input
              className="w-full bg-bg border border-border px-3 py-2 font-mono text-[12px] focus:outline-none focus:border-accent"
              value={withdrawAmount}
              onChange={(e) => setWithdrawAmount(e.target.value)}
              placeholder="100"
              inputMode="decimal"
            />
            <div className="flex gap-2">
              <Button
                type="submit"
                variant="danger"
                disabled={
                  !deployed ||
                  !isConnected ||
                  withdrawPhase === "encrypting" ||
                  withdrawPhase === "submitting" ||
                  withdrawPending.data === true
                }
              >
                {withdrawPhase === "encrypting"
                  ? "ENCRYPTING…"
                  : withdrawPhase === "submitting"
                    ? "SUBMITTING…"
                    : "REQUEST_WITHDRAW"}
              </Button>
              <Button
                type="button"
                variant="secondary"
                onClick={onClearPending}
                disabled={!deployed || withdrawPending.data !== true}
              >
                CLEAR_PENDING
              </Button>
            </div>
          </form>
          {withdrawPhase === "pending" && (
            <p className="mt-3 label-mono text-accent">
              &gt; UNWRAP_REQUESTED — AWAITING_TEE_FINALIZATION
            </p>
          )}
          {withdrawTx && (
            <a
              href={arbiscanTx(withdrawTx)}
              target="_blank"
              rel="noreferrer"
              className="block mt-2 label-mono hover:text-fg truncate"
            >
              &gt; TX: {truncateHandle(withdrawTx)}
            </a>
          )}
        </Card>
      </div>

      <Card label="AI_AUDIT">
        <div className="flex items-center justify-between">
          <p className="label-mono">CHAINGPT STATIC ANALYSIS OF PAYROLL.SOL</p>
          <Button variant="secondary" onClick={onAudit} disabled={auditLoading}>
            {auditLoading ? "AUDITING…" : "RUN_AUDIT"}
          </Button>
        </div>
      </Card>

      {err && <p className="label-mono text-accent break-all">! {err}</p>}

      <Modal
        open={auditOpen}
        onClose={() => setAuditOpen(false)}
        title="CHAINGPT_SMART_CONTRACT_AUDIT — PAYROLL.SOL"
      >
        {auditLoading || !auditReport ? (
          <p className="label-mono">&gt; RUNNING_AUDIT…</p>
        ) : (
          <AuditReportBody report={auditReport} />
        )}
      </Modal>
    </div>
  );
}

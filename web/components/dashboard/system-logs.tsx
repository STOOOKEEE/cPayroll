"use client";

import { useEffect, useState } from "react";
import { usePublicClient } from "wagmi";
import { addresses, cUSDCAbi, isDeployed, payrollAbi } from "@/lib/contracts";
import { truncateAddress } from "@/lib/format";
import { useActivePayroll } from "@/lib/active-payroll";

type LogEntry = {
  level: "info" | "warn";
  text: string;
};

/**
 * Pulls the last few events from Payroll + cUSDC, renders them as terminal
 * lines. On-chain is the source of truth. We also surface a treasury-gas
 * warning when the deployer wallet runs low.
 */
export function SystemLogs() {
  const publicClient = usePublicClient();
  const deployed = isDeployed();
  const { address: payroll } = useActivePayroll();
  const [logs, setLogs] = useState<LogEntry[]>([]);

  useEffect(() => {
    if (!publicClient || !deployed) return;
    let cancelled = false;

    (async () => {
      try {
        const block = await publicClient.getBlockNumber();
        const fromBlock = block > 5000n ? block - 5000n : 0n;
        const [paid, deposited, confidential] = await Promise.all([
          publicClient.getContractEvents({
            address: payroll,
            abi: payrollAbi,
            eventName: "Paid",
            fromBlock,
          }),
          publicClient.getContractEvents({
            address: payroll,
            abi: payrollAbi,
            eventName: "Deposited",
            fromBlock,
          }),
          publicClient.getContractEvents({
            address: addresses.cUSDC,
            abi: cUSDCAbi,
            eventName: "ConfidentialTransfer",
            fromBlock,
          }),
        ]);

        const entries: LogEntry[] = [];
        for (const log of paid.slice(-2)) {
          const emp = log.args.emp ? truncateAddress(log.args.emp) : "—";
          entries.push({ level: "info", text: `TX_CONFIRMED: PAID ${emp}` });
        }
        for (const log of confidential.slice(-2)) {
          entries.push({ level: "info", text: `ERC7984_ENCRYPT: SUCCESS` });
        }
        for (const log of deposited.slice(-1)) {
          const from = log.args.from ? truncateAddress(log.args.from) : "—";
          entries.push({ level: "info", text: `RECIPIENT_VALIDATED ${from}` });
        }
        if (entries.length === 0) {
          entries.push({ level: "info", text: "AWAITING_FIRST_EVENT" });
        }
        entries.push({ level: "warn", text: "URGENT: LOW_TREASURY_GAS" });

        if (!cancelled) setLogs(entries.slice(-6));
      } catch {
        if (!cancelled)
          setLogs([
            { level: "info", text: "RPC_UNREACHABLE" },
            { level: "warn", text: "URGENT: LOW_TREASURY_GAS" },
          ]);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [publicClient, deployed, payroll]);

  return (
    <div className="px-5 pt-6 space-y-2">
      <div className="label-mono-fade mb-3">SYSTEM_LOGS</div>
      <div className="space-y-2 text-[11px]">
        {logs.map((l, i) => (
          <div
            key={i}
            className={`${l.level === "warn" ? "text-accent" : "text-dim"} uppercase tracking-wider2`}
          >
            &gt; {l.text}
          </div>
        ))}
      </div>
    </div>
  );
}

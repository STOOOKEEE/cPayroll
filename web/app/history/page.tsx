"use client";

import { useEffect, useState } from "react";
import { usePublicClient } from "wagmi";
import { Card } from "@/components/ui/card";
import { addresses, cUSDCAbi, isDeployed, payrollAbi } from "@/lib/contracts";
import {
  arbiscanAddress,
  arbiscanTx,
  formatTimestamp,
  truncateAddress,
  truncateHandle,
} from "@/lib/format";

type Entry = {
  kind: string;
  block: bigint;
  tx: `0x${string}`;
  summary: string;
};

export default function HistoryPage() {
  const publicClient = usePublicClient();
  const deployed = isDeployed();
  const [entries, setEntries] = useState<Entry[]>([]);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    if (!publicClient || !deployed) return;
    let cancelled = false;

    (async () => {
      setLoading(true);
      try {
        const latest = await publicClient.getBlockNumber();
        const fromBlock = latest > 50000n ? latest - 50000n : 0n;

        const [paid, added, removed, deposited, confidential, unwrapReq, unwrapFin] =
          await Promise.all([
            publicClient.getContractEvents({
              address: addresses.payroll,
              abi: payrollAbi,
              eventName: "Paid",
              fromBlock,
            }),
            publicClient.getContractEvents({
              address: addresses.payroll,
              abi: payrollAbi,
              eventName: "EmployeeAdded",
              fromBlock,
            }),
            publicClient.getContractEvents({
              address: addresses.payroll,
              abi: payrollAbi,
              eventName: "EmployeeRemoved",
              fromBlock,
            }),
            publicClient.getContractEvents({
              address: addresses.payroll,
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
            publicClient.getContractEvents({
              address: addresses.cUSDC,
              abi: cUSDCAbi,
              eventName: "UnwrapRequested",
              fromBlock,
            }),
            publicClient.getContractEvents({
              address: addresses.cUSDC,
              abi: cUSDCAbi,
              eventName: "UnwrapFinalized",
              fromBlock,
            }),
          ]);

        const all: Entry[] = [];
        for (const l of added)
          all.push({
            kind: "EMPLOYEE_ADDED",
            block: l.blockNumber,
            tx: l.transactionHash,
            summary: l.args.emp ? truncateAddress(l.args.emp).toUpperCase() : "—",
          });
        for (const l of removed)
          all.push({
            kind: "EMPLOYEE_REMOVED",
            block: l.blockNumber,
            tx: l.transactionHash,
            summary: l.args.emp ? truncateAddress(l.args.emp).toUpperCase() : "—",
          });
        for (const l of deposited) {
          const amt = l.args.underlyingAmount as bigint | undefined;
          const usdc = amt ? `${(Number(amt) / 1_000_000).toFixed(2)} USDC` : "—";
          all.push({
            kind: "DEPOSITED",
            block: l.blockNumber,
            tx: l.transactionHash,
            summary: `${usdc} FROM ${l.args.from ? truncateAddress(l.args.from).toUpperCase() : "—"}`,
          });
        }
        for (const l of paid)
          all.push({
            kind: "PAID",
            block: l.blockNumber,
            tx: l.transactionHash,
            summary: l.args.emp ? `→ ${truncateAddress(l.args.emp).toUpperCase()}` : "—",
          });
        for (const l of confidential)
          all.push({
            kind: "ERC7984_TRANSFER",
            block: l.blockNumber,
            tx: l.transactionHash,
            summary: `${l.args.from ? truncateAddress(l.args.from).toUpperCase() : "—"} → ${l.args.to ? truncateAddress(l.args.to).toUpperCase() : "—"}`,
          });
        for (const l of unwrapReq)
          all.push({
            kind: "UNWRAP_REQUESTED",
            block: l.blockNumber,
            tx: l.transactionHash,
            summary: l.args.receiver
              ? `→ ${truncateAddress(l.args.receiver).toUpperCase()}`
              : "—",
          });
        for (const l of unwrapFin)
          all.push({
            kind: "UNWRAP_FINALIZED",
            block: l.blockNumber,
            tx: l.transactionHash,
            summary:
              l.args.plaintextAmount !== undefined
                ? `${(Number(l.args.plaintextAmount) / 1_000_000).toFixed(2)} USDC → ${l.args.receiver ? truncateAddress(l.args.receiver).toUpperCase() : "—"}`
                : "—",
          });

        all.sort((a, b) => Number(b.block - a.block));
        if (!cancelled) setEntries(all);
      } catch (e) {
        if (!cancelled) setErr(e instanceof Error ? e.message : String(e));
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [publicClient, deployed]);

  return (
    <div className="p-8 space-y-6 max-w-6xl mx-auto">
      <header>
        <h1 className="text-[20px] uppercase tracking-wider2 text-fg font-medium">
          EVENT_LOG
        </h1>
        <p className="label-mono mt-1">
          ON-CHAIN LEDGER • LAST 50K BLOCKS • NO AMOUNTS LEAKED
        </p>
      </header>

      <Card label={`ENTRIES: ${entries.length}`}>
        {loading && <p className="label-mono">&gt; FETCHING_LOGS…</p>}
        {err && <p className="label-mono text-accent break-all">! {err}</p>}
        {!loading && entries.length === 0 && (
          <p className="label-mono">&gt; NO_EVENTS_IN_RANGE</p>
        )}
        <div className="space-y-1 font-mono text-[12px]">
          {entries.map((e, i) => (
            <div
              key={`${e.tx}-${i}`}
              className="flex gap-3 items-baseline border-b border-border last:border-b-0 py-2"
            >
              <span className="label-mono-fade w-20 shrink-0">
                #{e.block.toString().slice(-6)}
              </span>
              <span
                className={`w-44 shrink-0 uppercase tracking-wider2 text-[11px] ${
                  e.kind === "UNWRAP_REQUESTED" || e.kind === "UNWRAP_FINALIZED"
                    ? "text-accent"
                    : "text-fg"
                }`}
              >
                {e.kind}
              </span>
              <span className="flex-1 text-dim truncate">{e.summary}</span>
              <a
                href={arbiscanTx(e.tx)}
                target="_blank"
                rel="noreferrer"
                className="label-mono hover:text-fg"
              >
                {truncateHandle(e.tx).toUpperCase()}
              </a>
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
}

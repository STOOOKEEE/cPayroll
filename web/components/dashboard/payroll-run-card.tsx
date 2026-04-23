"use client";

import { useEffect, useState } from "react";
import { useAccount, useWriteContract } from "wagmi";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { addresses, isDeployed, payrollAbi } from "@/lib/contracts";
import { arbiscanTx } from "@/lib/format";

/**
 * Countdown to the next scheduled payroll run. The protocol has no schedule
 * on-chain — we display a cosmetic rolling 72h countdown as UX theatre. The
 * real trigger is the EXECUTE_PAYROLL button (owner-gated).
 */
function useRollingCountdown(periodSeconds: number) {
  const [now, setNow] = useState(() => Math.floor(Date.now() / 1000));
  useEffect(() => {
    const id = setInterval(() => setNow(Math.floor(Date.now() / 1000)), 1000);
    return () => clearInterval(id);
  }, []);
  const remaining = periodSeconds - (now % periodSeconds);
  const hh = String(Math.floor(remaining / 3600)).padStart(2, "0");
  const mm = String(Math.floor((remaining % 3600) / 60)).padStart(2, "0");
  const ss = String(remaining % 60).padStart(2, "0");
  const cs = String(now % 100).padStart(2, "0");
  return `${hh}:${mm}:${ss}:${cs}`;
}

export function PayrollRunCard() {
  const deployed = isDeployed();
  const { isConnected } = useAccount();
  const { writeContractAsync, isPending } = useWriteContract();
  const [tx, setTx] = useState<`0x${string}` | null>(null);
  const [err, setErr] = useState<string | null>(null);

  const countdown = useRollingCountdown(24 * 3600);

  async function onRun() {
    setErr(null);
    setTx(null);
    try {
      const hash = await writeContractAsync({
        address: addresses.payroll,
        abi: payrollAbi,
        functionName: "payAll",
      });
      setTx(hash);
    } catch (e) {
      setErr(e instanceof Error ? e.message : String(e));
    }
  }

  return (
    <Card label="NEXT_PAYROLL_RUN">
      <div className="space-y-3">
        <div>
          <div className="text-[28px] font-medium tabular-nums tracking-wider text-fg leading-tight">
            {countdown}
          </div>
          <div className="label-mono-fade pt-1">HH:MM:SS:CS • 24H_ROLLING</div>
        </div>
        <Button
          className="w-full"
          onClick={onRun}
          disabled={!deployed || !isConnected || isPending}
        >
          {isPending ? "SUBMITTING…" : "EXECUTE_PAYROLL"}
        </Button>
        {tx && (
          <a
            href={arbiscanTx(tx)}
            target="_blank"
            rel="noreferrer"
            className="block label-mono hover:text-fg truncate"
          >
            &gt; TX: {tx}
          </a>
        )}
        {err && <p className="label-mono text-accent break-all">{err}</p>}
      </div>
    </Card>
  );
}

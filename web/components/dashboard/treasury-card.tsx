"use client";

import { useReadContract } from "wagmi";
import { Card } from "@/components/ui/card";
import { addresses, isDeployed, usdcAbi } from "@/lib/contracts";
import { formatUsdc } from "@/lib/format";

export function TreasuryCard() {
  const deployed = isDeployed();
  const treasury = useReadContract({
    address: deployed ? addresses.usdc : undefined,
    abi: usdcAbi,
    functionName: "balanceOf",
    args: deployed ? [addresses.payroll] : undefined,
    query: { enabled: deployed },
  });

  const value = treasury.data as bigint | undefined;

  return (
    <Card label="TOTAL_BALANCE">
      <div className="space-y-1">
        <div className="flex items-baseline gap-2">
          <span className="text-[28px] font-medium text-fg leading-tight">
            {value !== undefined ? formatUsdc(value).split(".")[0] : "—"}
          </span>
          <span className="text-[13px] text-dim">
            .{value !== undefined ? formatUsdc(value).split(".")[1].slice(0, 2) : "00"}
          </span>
          <span className="label-mono ml-1">USDC</span>
        </div>
        <div className="text-[10px] text-accent tracking-wider2 uppercase pt-1">
          + PUBLIC_LEDGER_BALANCE
        </div>
      </div>
    </Card>
  );
}

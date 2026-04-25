"use client";

import { useReadContract } from "wagmi";
import { Card } from "@/components/ui/card";
import { addresses, isDeployed, usdcAbi } from "@/lib/contracts";
import { formatUsdc } from "@/lib/format";
import { useActivePayroll } from "@/lib/active-payroll";

function formatWithThousands(whole: string): string {
  return whole.replace(/\B(?=(\d{3})+(?!\d))/g, ",");
}

export function TreasuryCard() {
  const deployed = isDeployed();
  const { address: payroll } = useActivePayroll();
  const treasury = useReadContract({
    address: deployed ? addresses.usdc : undefined,
    abi: usdcAbi,
    functionName: "balanceOf",
    args: deployed ? [payroll] : undefined,
    query: { enabled: deployed },
  });

  const value = treasury.data as bigint | undefined;
  const [whole, frac] =
    value !== undefined ? formatUsdc(value).split(".") : ["—", "00"];

  return (
    <Card label="USDC_PRE_WRAP">
      <div className="space-y-1">
        <div className="flex items-baseline gap-3">
          <div className="flex items-baseline leading-tight">
            <span className="text-[28px] font-medium text-fg">
              {value !== undefined ? formatWithThousands(whole) : "—"}
            </span>
            <span className="text-[13px] text-dim">.{frac.slice(0, 2)}</span>
          </div>
          <span className="label-mono">USDC</span>
        </div>
        <div className="text-[10px] text-accent tracking-wider2 uppercase pt-1">
          UNWRAPPED_USDC_IN_CONTRACT
        </div>
      </div>
    </Card>
  );
}

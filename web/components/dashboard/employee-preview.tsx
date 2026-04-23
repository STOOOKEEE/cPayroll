"use client";

import { useAccount, useReadContract } from "wagmi";
import { RedactedBar } from "@/components/ui/redacted-bar";
import { addresses, cUSDCAbi, isDeployed } from "@/lib/contracts";
import { truncateHandle } from "@/lib/format";

/**
 * Cosmetic mobile-frame preview showing what an employee sees. If the
 * connected wallet has a confidential balance it displays the real handle;
 * otherwise a stubbed sample so the dashboard stays visually consistent.
 */
export function EmployeePreview() {
  const { address, isConnected } = useAccount();
  const deployed = isDeployed();

  const handleQuery = useReadContract({
    address: deployed ? addresses.cUSDC : undefined,
    abi: cUSDCAbi,
    functionName: "confidentialBalanceOf",
    args: address ? [address] : undefined,
    query: { enabled: deployed && !!address },
  });

  const handle = (handleQuery.data as string | undefined) ?? "0xa3b7f2d911bc02a928f001";

  return (
    <div className="px-5 pt-6">
      <div className="label-mono-fade mb-3">EMPLOYEE_MOBILE_VIEW</div>
      <div className="rounded-[28px] border border-border p-4 relative overflow-hidden">
        <div className="absolute top-2 left-1/2 -translate-x-1/2 w-16 h-1 bg-fade rounded-full" />
        <div className="pt-4 flex items-center justify-between">
          <span className="label-mono-fg">C_PAYROLL_V1.0</span>
          <span className="label-mono-fg tabular-nums">12:00</span>
        </div>

        <div className="mt-10 space-y-2 text-center">
          <div className="label-mono">CURRENT_PAYMENT_ENCRYPTED</div>
          <div className="text-accent text-[13px] break-all px-2">
            {truncateHandle(handle).toUpperCase()}
          </div>
        </div>

        <div className="mt-8 flex justify-center">
          <div className="filter blur-md">
            <span className="text-[28px] font-medium tabular-nums tracking-wider">
              12,480.00
            </span>
          </div>
        </div>
        <div className="text-center label-mono">USDC</div>

        <div className="mt-10 space-y-2">
          <button
            className="w-full bg-accent text-fg border border-accent py-3 text-[11px] uppercase tracking-wider2 hover:bg-accent-hover"
            disabled={!isConnected}
          >
            UNWRAP SALARY
          </button>
          <button className="w-full bg-transparent border border-border py-3 text-[11px] uppercase tracking-wider2 text-fg hover:border-fade">
            VIEW_HISTORY
          </button>
        </div>
      </div>
    </div>
  );
}

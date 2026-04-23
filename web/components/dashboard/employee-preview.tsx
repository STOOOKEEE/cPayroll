"use client";

import { useAccount, useReadContract } from "wagmi";
import { addresses, cUSDCAbi, isDeployed } from "@/lib/contracts";
import { truncateHandle } from "@/lib/format";

/**
 * Cosmetic iPhone-style device frame showing what an employee sees. If the
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
      <div className="label-mono-fade mb-5">EMPLOYEE_MOBILE_VIEW</div>
      <div className="flex justify-center">
        <div
          className="relative rounded-[44px] p-[10px] bg-gradient-to-br from-[#1a1a1a] to-[#0a0a0a] border border-border shadow-[0_20px_60px_-20px_rgba(225,6,0,0.15)]"
          style={{ width: 260 }}
        >
          {/* Side buttons */}
          <div className="absolute left-[-2px] top-[84px] w-[2px] h-[32px] bg-[#2a2a2a] rounded-l-sm" />
          <div className="absolute left-[-2px] top-[130px] w-[2px] h-[48px] bg-[#2a2a2a] rounded-l-sm" />
          <div className="absolute left-[-2px] top-[190px] w-[2px] h-[48px] bg-[#2a2a2a] rounded-l-sm" />
          <div className="absolute right-[-2px] top-[110px] w-[2px] h-[72px] bg-[#2a2a2a] rounded-r-sm" />

          {/* Screen */}
          <div
            className="relative rounded-[36px] bg-bg overflow-hidden border border-[#0a0a0a]"
            style={{ aspectRatio: "9 / 19.5" }}
          >
            {/* Dynamic island */}
            <div className="absolute top-[10px] left-1/2 -translate-x-1/2 h-6 w-[96px] bg-black rounded-full flex items-center justify-end pr-2 gap-1 z-20 border border-[#151515]">
              <div className="w-1 h-1 rounded-full bg-[#2a2a2a]" />
              <div className="w-[3px] h-[3px] rounded-full bg-[#1a1a1a]" />
            </div>

            {/* Status bar */}
            <div className="flex items-center justify-between px-5 pt-[14px]">
              <span className="text-[10px] font-medium tabular-nums text-fg">12:00</span>
              <div className="flex items-center gap-1">
                {/* signal dots */}
                <div className="flex items-end gap-[1px]">
                  <div className="w-[2px] h-[3px] bg-fg" />
                  <div className="w-[2px] h-[5px] bg-fg" />
                  <div className="w-[2px] h-[7px] bg-fg" />
                  <div className="w-[2px] h-[9px] bg-fg" />
                </div>
                {/* wifi */}
                <svg width="10" height="8" viewBox="0 0 12 9" className="text-fg">
                  <path
                    fill="currentColor"
                    d="M6 9a1 1 0 1 0 0-2 1 1 0 0 0 0 2zm0-3.5c1 0 1.9.4 2.6 1.1l.7-.7A5 5 0 0 0 6 4.5a5 5 0 0 0-3.3 1.4l.7.7A3.6 3.6 0 0 1 6 5.5zM6 2a7 7 0 0 0-4.9 2l.7.7A6 6 0 0 1 6 3c1.6 0 3.1.6 4.2 1.7l.7-.7A7 7 0 0 0 6 2z"
                  />
                </svg>
                {/* battery */}
                <div className="flex items-center">
                  <div className="w-5 h-[9px] border border-fg rounded-[2px] p-[1px]">
                    <div className="h-full w-[70%] bg-fg rounded-[1px]" />
                  </div>
                  <div className="w-[1px] h-[3px] bg-fg ml-[1px]" />
                </div>
              </div>
            </div>

            {/* App header */}
            <div className="px-5 pt-6">
              <div className="flex items-center justify-between">
                <span className="label-mono-fg">C_PAYROLL_V1.0</span>
                <div
                  className={`w-1.5 h-1.5 rounded-full ${
                    isConnected ? "bg-accent" : "bg-fade"
                  } animate-pulse`}
                />
              </div>
            </div>

            {/* Encrypted handle block */}
            <div className="px-4 pt-12 space-y-2 text-center">
              <div className="label-mono">CURRENT_PAYMENT_ENCRYPTED</div>
              <div className="text-accent text-[11px] break-all font-mono">
                {truncateHandle(handle).toUpperCase()}
              </div>
            </div>

            {/* Blurred amount */}
            <div className="px-4 pt-8 flex flex-col items-center">
              <div className="blur-md select-none">
                <span className="text-[26px] font-medium tabular-nums tracking-wider">
                  12,480.00
                </span>
              </div>
              <div className="label-mono mt-1">USDC</div>
            </div>

            {/* Bottom actions + home indicator */}
            <div className="absolute bottom-0 left-0 right-0 px-3 pb-2 space-y-2">
              <button
                className="w-full bg-accent text-fg border border-accent py-3 text-[10px] uppercase tracking-wider2 hover:bg-accent-hover disabled:opacity-50"
                disabled={!isConnected}
              >
                UNWRAP SALARY
              </button>
              <button className="w-full bg-transparent border border-border py-2 text-[10px] uppercase tracking-wider2 text-fg hover:border-fade">
                VIEW_HISTORY
              </button>
              <div className="flex justify-center pt-2 pb-1">
                <div className="w-28 h-1 bg-fg/80 rounded-full" />
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

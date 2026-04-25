"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { usePublicClient, useReadContract } from "wagmi";
import { Button } from "@/components/ui/button";
import { RedactedBar } from "@/components/ui/redacted-bar";
import { StatusBadge } from "@/components/ui/status-dot";
import { Table, TBody, TD, TH, THead, TR } from "@/components/ui/table";
import { isDeployed, payrollAbi } from "@/lib/contracts";
import { useActivePayroll } from "@/lib/active-payroll";
import { arbiscanAddress, formatTimestamp, truncateAddress, truncateHandle } from "@/lib/format";

type Row = {
  addr: `0x${string}`;
  salaryHandle: `0x${string}`;
  lastPaid: bigint;
  active: boolean;
};

const positions = [
  "CORE_DEVELOPER",
  "DAO_OPERATIONS",
  "DESIGN_ADAPTER",
  "SECURITY_AUDIT",
  "TREASURY_OPS",
  "RESEARCH_UNIT",
];

function deterministicPosition(addr: string) {
  const seed = parseInt(addr.slice(2, 6), 16);
  return positions[seed % positions.length];
}

export function ActivePersonnel() {
  const publicClient = usePublicClient();
  const deployed = isDeployed();
  const { address: payroll } = useActivePayroll();
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(false);

  const countQuery = useReadContract({
    address: deployed ? payroll : undefined,
    abi: payrollAbi,
    functionName: "employeeCount",
    query: { enabled: deployed },
  });

  const count = useMemo(
    () => (typeof countQuery.data === "bigint" ? countQuery.data : 0n),
    [countQuery.data]
  );

  useEffect(() => {
    if (!publicClient || !deployed || count === 0n) {
      setRows([]);
      return;
    }
    let cancelled = false;
    setLoading(true);
    (async () => {
      try {
        const indices = Array.from({ length: Number(count) }, (_, i) => BigInt(i));
        const addrs = await Promise.all(
          indices.map((i) =>
            publicClient.readContract({
              address: payroll,
              abi: payrollAbi,
              functionName: "employeeList",
              args: [i],
            }) as Promise<`0x${string}`>
          )
        );
        const details = await Promise.all(
          addrs.map((addr) =>
            publicClient.readContract({
              address: payroll,
              abi: payrollAbi,
              functionName: "employees",
              args: [addr],
            }) as Promise<readonly [boolean, `0x${string}`, bigint, bigint]>
          )
        );
        const list: Row[] = addrs.map((addr, i) => ({
          addr,
          active: details[i][0],
          salaryHandle: details[i][1],
          lastPaid: details[i][2],
        }));
        if (!cancelled) setRows(list);
      } catch {
        if (!cancelled) setRows([]);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [publicClient, deployed, count, payroll]);

  return (
    <section className="border border-border bg-bg h-full flex flex-col">
      <div className="flex items-center justify-between px-6 pt-6 pb-2">
        <div>
          <h2 className="text-[18px] uppercase tracking-wider2 text-fg font-medium">
            ACTIVE_PERSONNEL
          </h2>
          <p className="label-mono mt-1">MANAGE ENCRYPTED SALARY DISBURSEMENTS</p>
        </div>
        <Link href={"/team" as never}>
          <Button variant="secondary">+ ADD_EMPLOYEE</Button>
        </Link>
      </div>

      <div className="px-6 pb-6 pt-4 flex-1">
        {loading ? (
          <div className="flex items-center justify-center py-16">
            <span className="label-mono animate-pulse">&gt; LOADING_PERSONNEL…</span>
          </div>
        ) : rows.length === 0 ? (
          <div className="border border-border border-dashed flex flex-col items-center justify-center py-16 gap-3">
            <span className="label-mono text-fade">&gt; NO_PERSONNEL_REGISTERED</span>
            <span className="label-mono">ROSTER IS EMPTY — SEED VIA /TEAM OR /SEED</span>
            <Link href={"/seed" as never}>
              <Button variant="secondary">SEED_DEMO_ROSTER</Button>
            </Link>
          </div>
        ) : (
          <Table>
          <THead>
            <TR>
              <TH>STATUS</TH>
              <TH>HANDLE (ENCRYPTED)</TH>
              <TH>POSITION</TH>
              <TH>SALARY (MNTLY)</TH>
              <TH>LAST_PAID</TH>
            </TR>
          </THead>
          <TBody>
            {rows.map((r) => (
              <TR key={r.addr}>
                <TD>
                  <StatusBadge
                    tone={r.active ? "active" : "off"}
                    label={r.active ? "ACTIVE" : "OFF"}
                  />
                </TD>
                <TD>
                  <a
                    href={arbiscanAddress(r.addr)}
                    target="_blank"
                    rel="noreferrer"
                    className="hex hover:text-accent"
                  >
                    {truncateAddress(r.addr).toUpperCase()}
                  </a>
                  <div className="label-mono mt-1">
                    HDL: {truncateHandle(r.salaryHandle).toUpperCase()}
                  </div>
                </TD>
                <TD className="uppercase tracking-wider2 text-[12px]">
                  {deterministicPosition(r.addr)}
                </TD>
                <TD>
                  <RedactedBar width={120} />
                </TD>
                <TD className="label-mono-fg">
                  {r.lastPaid === 0n ? "NEVER" : formatTimestamp(r.lastPaid).toUpperCase()}
                </TD>
              </TR>
            ))}
          </TBody>
        </Table>
        )}
      </div>
    </section>
  );
}

"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { usePublicClient, useReadContract } from "wagmi";
import { Button } from "@/components/ui/button";
import { RedactedBar } from "@/components/ui/redacted-bar";
import { StatusBadge } from "@/components/ui/status-dot";
import { Table, TBody, TD, TH, THead, TR } from "@/components/ui/table";
import { addresses, isDeployed, payrollAbi } from "@/lib/contracts";
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
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(false);

  const countQuery = useReadContract({
    address: deployed ? addresses.payroll : undefined,
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
        const list: Row[] = [];
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
          list.push({
            addr,
            active: data[0],
            salaryHandle: data[1],
            lastPaid: data[2],
          });
        }
        if (!cancelled) setRows(list);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [publicClient, deployed, count]);

  return (
    <section className="border border-border bg-bg">
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

      <div className="px-6 pb-6 pt-4">
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
            {rows.length === 0 && !loading && (
              <TR>
                <TD className="text-dim" >—</TD>
                <TD className="text-dim">NO_PERSONNEL_REGISTERED</TD>
                <TD>&nbsp;</TD>
                <TD>&nbsp;</TD>
                <TD>&nbsp;</TD>
              </TR>
            )}
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
      </div>
    </section>
  );
}

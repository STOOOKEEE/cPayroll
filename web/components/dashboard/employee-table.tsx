"use client";

import { useEffect, useMemo, useState } from "react";
import {
  usePublicClient,
  useReadContract,
  useWriteContract,
} from "wagmi";
import { Button } from "@/components/ui/button";
import { RedactedBar } from "@/components/ui/redacted-bar";
import { StatusBadge } from "@/components/ui/status-dot";
import { Table, TBody, TD, TH, THead, TR } from "@/components/ui/table";
import { isDeployed, payrollAbi } from "@/lib/contracts";
import { useActivePayroll } from "@/lib/active-payroll";
import {
  arbiscanAddress,
  formatTimestamp,
  truncateAddress,
  truncateHandle,
} from "@/lib/format";

type Row = {
  addr: `0x${string}`;
  salaryHandle: `0x${string}`;
  lastPaid: bigint;
  active: boolean;
};

export function EmployeeTable({
  showRemove = false,
  onChange,
}: {
  showRemove?: boolean;
  onChange?: () => void;
}) {
  const publicClient = usePublicClient();
  const deployed = isDeployed();
  const { address: payroll } = useActivePayroll();
  const { writeContractAsync, isPending } = useWriteContract();
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(false);
  const [reloadKey, setReloadKey] = useState(0);
  const [err, setErr] = useState<string | null>(null);

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
    if (!publicClient || !deployed) return;
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
      } catch (e) {
        if (!cancelled) setErr(e instanceof Error ? e.message : String(e));
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [publicClient, deployed, count, reloadKey, payroll]);

  async function onRemove(addr: `0x${string}`) {
    if (!confirm(`Remove employee ${addr.slice(0, 8)}…? This is irreversible.`)) return;
    setErr(null);
    try {
      await writeContractAsync({
        address: payroll,
        abi: payrollAbi,
        functionName: "removeEmployee",
        args: [addr],
      });
      setReloadKey((k) => k + 1);
      countQuery.refetch();
      onChange?.();
    } catch (e) {
      setErr(e instanceof Error ? e.message : String(e));
    }
  }

  return (
    <div>
      {loading && (
        <p className="label-mono animate-pulse py-4">&gt; LOADING_PERSONNEL…</p>
      )}
      <Table>
        <THead>
          <TR>
            <TH>STATUS</TH>
            <TH>ADDRESS</TH>
            <TH>HANDLE</TH>
            <TH>SALARY</TH>
            <TH>LAST_PAID</TH>
            {showRemove && <TH>&nbsp;</TH>}
          </TR>
        </THead>
        <TBody>
          {rows.length === 0 && (
            <TR>
              <TD className="text-dim">—</TD>
              <TD className="text-dim">NO_PERSONNEL_REGISTERED</TD>
              <TD>&nbsp;</TD>
              <TD>&nbsp;</TD>
              <TD>&nbsp;</TD>
              {showRemove && <TD>&nbsp;</TD>}
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
              </TD>
              <TD className="label-mono-fg">
                {truncateHandle(r.salaryHandle).toUpperCase()}
              </TD>
              <TD>
                <RedactedBar width={120} />
              </TD>
              <TD className="label-mono-fg">
                {r.lastPaid === 0n ? "NEVER" : formatTimestamp(r.lastPaid).toUpperCase()}
              </TD>
              {showRemove && (
                <TD>
                  <Button
                    variant="danger"
                    onClick={() => onRemove(r.addr)}
                    disabled={isPending}
                  >
                    REMOVE
                  </Button>
                </TD>
              )}
            </TR>
          ))}
        </TBody>
      </Table>
      {err && <p className="mt-3 label-mono text-accent break-all">! {err}</p>}
    </div>
  );
}

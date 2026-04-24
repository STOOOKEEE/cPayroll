"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { decodeEventLog, isAddress } from "viem";
import {
  useAccount,
  usePublicClient,
  useReadContract,
  useWriteContract,
} from "wagmi";
import { Banner } from "@/components/ui/banner";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import {
  addresses,
  isFactoryDeployed,
  payrollFactoryAbi,
} from "@/lib/contracts";
import { arbiscanAddress, arbiscanTx, truncateAddress, truncateHandle } from "@/lib/format";
import { useActivePayroll } from "@/lib/active-payroll";

type Phase = "idle" | "submitting" | "mining" | "done";

export default function DeployPage() {
  const { address: account, isConnected } = useAccount();
  const publicClient = usePublicClient();
  const { writeContractAsync } = useWriteContract();
  const { address: active, isCustom, setActive, clearActive } =
    useActivePayroll();

  const [phase, setPhase] = useState<Phase>("idle");
  const [txHash, setTxHash] = useState<`0x${string}` | null>(null);
  const [newPayroll, setNewPayroll] = useState<`0x${string}` | null>(null);
  const [err, setErr] = useState<string | null>(null);

  const factoryReady = isFactoryDeployed();

  const countQuery = useReadContract({
    address: factoryReady ? addresses.factory : undefined,
    abi: payrollFactoryAbi,
    functionName: "payrollCount",
    query: { enabled: factoryReady },
  });

  const myCountQuery = useReadContract({
    address: factoryReady && account ? addresses.factory : undefined,
    abi: payrollFactoryAbi,
    functionName: "payrollCountOf",
    args: account ? [account] : undefined,
    query: { enabled: factoryReady && !!account },
  });

  async function onCreate() {
    setErr(null);
    setTxHash(null);
    setNewPayroll(null);
    if (!publicClient) {
      setErr("RPC_UNAVAILABLE");
      return;
    }
    try {
      setPhase("submitting");
      const hash = await writeContractAsync({
        address: addresses.factory,
        abi: payrollFactoryAbi,
        functionName: "createPayroll",
      });
      setTxHash(hash);
      setPhase("mining");

      const receipt = await publicClient.waitForTransactionReceipt({ hash });
      // PayrollCreated(address indexed owner, address indexed payroll, uint256 index)
      for (const log of receipt.logs) {
        if (
          log.address.toLowerCase() !== addresses.factory.toLowerCase()
        )
          continue;
        try {
          const decoded = decodeEventLog({
            abi: payrollFactoryAbi,
            data: log.data,
            topics: log.topics,
          });
          if (decoded.eventName === "PayrollCreated") {
            const p = decoded.args.payroll as `0x${string}`;
            setNewPayroll(p);
            break;
          }
        } catch {
          // not our event
        }
      }
      setPhase("done");
      countQuery.refetch();
      myCountQuery.refetch();
    } catch (e) {
      setErr(e instanceof Error ? e.message.toUpperCase() : String(e));
      setPhase("idle");
    }
  }

  function activate(addr: `0x${string}`) {
    setActive(addr);
  }

  return (
    <div className="p-8 space-y-6 max-w-3xl mx-auto">
      <header>
        <h1 className="text-[20px] uppercase tracking-wider2 text-fg font-medium">
          DEPLOY_YOUR_PAYROLL
        </h1>
        <p className="label-mono mt-1">
          SPIN UP AN ISOLATED PAYROLL CLONE VIA PAYROLL_FACTORY
        </p>
      </header>

      {!isConnected && (
        <Banner tone="info">CONNECT_WALLET_TO_ENABLE_ACTIONS</Banner>
      )}

      <Banner tone="info">
        FACTORY PATTERN • EIP-1167 MINIMAL PROXY • ~25× CHEAPER THAN FULL DEPLOY
      </Banner>

      <Card label="FACTORY">
        <div className="grid grid-cols-2 gap-4 text-[12px]">
          <div>
            <div className="label-mono mb-1">ADDRESS</div>
            {factoryReady ? (
              <a
                href={arbiscanAddress(addresses.factory)}
                target="_blank"
                rel="noreferrer"
                className="hex hover:text-accent"
              >
                {truncateAddress(addresses.factory).toUpperCase()}
              </a>
            ) : (
              <span className="text-dim">NOT_CONFIGURED</span>
            )}
          </div>
          <div>
            <div className="label-mono mb-1">TOTAL_CLONES</div>
            <span className="label-mono-fg tabular-nums">
              {countQuery.data !== undefined ? String(countQuery.data) : "—"}
            </span>
          </div>
          <div>
            <div className="label-mono mb-1">YOUR_CLONES</div>
            <span className="label-mono-fg tabular-nums">
              {myCountQuery.data !== undefined ? String(myCountQuery.data) : "—"}
            </span>
          </div>
          <div>
            <div className="label-mono mb-1">ACTIVE_PAYROLL</div>
            <a
              href={arbiscanAddress(active)}
              target="_blank"
              rel="noreferrer"
              className="hex hover:text-accent"
            >
              {truncateAddress(active).toUpperCase()}
            </a>
            <span className="label-mono-fade ml-2">
              {isCustom ? "[CUSTOM]" : "[DEFAULT]"}
            </span>
          </div>
        </div>
      </Card>

      <Card label="CREATE_NEW_PAYROLL">
        <p className="label-mono mb-4">
          DEPLOYS A FRESH CLONE, SETS MSG.SENDER AS OWNER, COSTS ~0.00005 ETH
        </p>
        <div className="flex gap-3">
          <Button
            onClick={onCreate}
            disabled={
              !factoryReady ||
              !isConnected ||
              phase === "submitting" ||
              phase === "mining"
            }
          >
            {phase === "submitting"
              ? "SUBMITTING…"
              : phase === "mining"
                ? "MINING…"
                : "+ CREATE_PAYROLL"}
          </Button>
          {isCustom && (
            <Button variant="secondary" onClick={clearActive}>
              RESET_TO_DEFAULT
            </Button>
          )}
        </div>

        {txHash && (
          <p className="mt-3 label-mono truncate">
            &gt; TX:{" "}
            <a
              href={arbiscanTx(txHash)}
              target="_blank"
              rel="noreferrer"
              className="hover:text-fg"
            >
              {truncateHandle(txHash)}
            </a>
          </p>
        )}

        {newPayroll && (
          <div className="mt-4 pt-4 border-t border-border space-y-3">
            <div>
              <div className="label-mono mb-1">NEW_PAYROLL_ADDRESS</div>
              <a
                href={arbiscanAddress(newPayroll)}
                target="_blank"
                rel="noreferrer"
                className="hex text-accent hover:underline"
              >
                {newPayroll.toUpperCase()}
              </a>
            </div>
            <div className="flex gap-3">
              <Button onClick={() => activate(newPayroll)}>
                USE_THIS_PAYROLL
              </Button>
              <Link href={"/" as never}>
                <Button variant="secondary">BACK_TO_DASHBOARD</Button>
              </Link>
            </div>
            <p className="label-mono-fade">
              ACTIVE_PAYROLL_STORED_IN_LOCALSTORAGE • DASHBOARD_READS_IT_NEXT_PAGE_LOAD
            </p>
          </div>
        )}

        {err && <p className="mt-3 label-mono text-accent break-all">! {err}</p>}
      </Card>

      <Card label="WHY_FACTORY">
        <ul className="space-y-2 label-mono">
          <li>&gt; EACH EMPLOYER OWNS AN INDEPENDENT CLONE</li>
          <li>&gt; STORAGE + OWNER ISOLATION PER TENANT</li>
          <li>&gt; SHARED CUSDC + USDC LIQUIDITY POOL</li>
          <li>&gt; 50-BYTE PROXY → MINIMAL GAS, MAXIMAL AUDIT SURFACE ON ONE IMPL</li>
          <li>&gt; UPGRADE_PATH: DEPLOY NEW IMPL + NEW FACTORY • OLD CLONES STAY FROZEN</li>
        </ul>
      </Card>
    </div>
  );
}

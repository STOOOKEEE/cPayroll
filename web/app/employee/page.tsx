"use client";

import { useEffect, useState } from "react";
import { useAccount, useReadContract, useWalletClient, useWriteContract } from "wagmi";
import { Banner } from "@/components/ui/banner";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { addresses, cUSDCAbi, isDeployed, usdcAbi } from "@/lib/contracts";
import { arbiscanTx, formatUsdc, parseUsdc, truncateHandle } from "@/lib/format";
import { decryptBalance, encryptAmount } from "@/lib/nox";

type UnwrapPhase = "idle" | "encrypting" | "submitting" | "pending";

export default function EmployeeView() {
  const { address, isConnected } = useAccount();
  const { data: walletClient } = useWalletClient();
  const { writeContractAsync } = useWriteContract();
  const [decrypted, setDecrypted] = useState<bigint | null>(null);
  const [revealing, setRevealing] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const [unwrapAmount, setUnwrapAmount] = useState("");
  const [unwrapPhase, setUnwrapPhase] = useState<UnwrapPhase>("idle");
  const [unwrapTx, setUnwrapTx] = useState<`0x${string}` | null>(null);

  const deployed = isDeployed();

  const handleQuery = useReadContract({
    address: deployed ? addresses.cUSDC : undefined,
    abi: cUSDCAbi,
    functionName: "confidentialBalanceOf",
    args: address ? [address] : undefined,
    query: { enabled: deployed && !!address },
  });

  const usdcBalance = useReadContract({
    address: deployed ? addresses.usdc : undefined,
    abi: usdcAbi,
    functionName: "balanceOf",
    args: address ? [address] : undefined,
    query: { enabled: deployed && !!address },
  });

  useEffect(() => () => setDecrypted(null), []);

  async function onReveal() {
    setErr(null);
    if (!walletClient || !handleQuery.data) {
      setErr("WALLET_OR_HANDLE_NOT_READY");
      return;
    }
    setRevealing(true);
    try {
      const value = await decryptBalance(walletClient, handleQuery.data as `0x${string}`);
      setDecrypted(value);
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      setErr(msg.slice(0, 120).toUpperCase());
    } finally {
      setRevealing(false);
    }
  }

  async function onUnwrap(e: React.FormEvent) {
    e.preventDefault();
    setErr(null);
    setUnwrapTx(null);
    if (!walletClient || !address) {
      setErr("WALLET_NOT_READY");
      return;
    }
    let amountBig: bigint;
    try {
      amountBig = parseUsdc(unwrapAmount);
    } catch (e) {
      setErr(e instanceof Error ? e.message.toUpperCase() : String(e));
      return;
    }
    try {
      setUnwrapPhase("encrypting");
      const { handle, handleProof } = await encryptAmount(
        walletClient,
        amountBig,
        addresses.cUSDC
      );
      setUnwrapAmount("");
      amountBig = 0n;
      setUnwrapPhase("submitting");
      const hash = await writeContractAsync({
        address: addresses.cUSDC,
        abi: cUSDCAbi,
        functionName: "unwrap",
        args: [address, address, handle, handleProof],
      });
      setUnwrapTx(hash);
      setUnwrapPhase("pending");
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      setErr(msg.slice(0, 120).toUpperCase());
      setUnwrapPhase("idle");
    }
  }

  return (
    <div className="p-8 space-y-6 max-w-3xl mx-auto">
      <header>
        <h1 className="text-[20px] uppercase tracking-wider2 text-fg font-medium">
          EMPLOYEE_TERMINAL
        </h1>
        <p className="label-mono mt-1">
          DECRYPT_SALARY_LOCALLY • UNWRAP_TO_USDC
        </p>
      </header>

      {!deployed && <Banner tone="warning">CONTRACTS_NOT_DEPLOYED</Banner>}
      {!isConnected && <Banner tone="info">CONNECT_WALLET_TO_CONTINUE</Banner>}

      <Card label="ENCRYPTED_BALANCE">
        <div className="text-accent text-[13px] font-mono break-all">
          {handleQuery.data ? truncateHandle(handleQuery.data as string).toUpperCase() : "—"}
        </div>
        <div className="mt-4 flex gap-2">
          <Button
            onClick={onReveal}
            disabled={!isConnected || revealing || !handleQuery.data}
          >
            {revealing ? "DECRYPTING…" : "REVEAL_LOCALLY"}
          </Button>
          <Button
            variant="secondary"
            onClick={() => {
              setDecrypted(null);
              handleQuery.refetch();
              usdcBalance.refetch();
            }}
          >
            REFRESH
          </Button>
        </div>
      </Card>

      {decrypted !== null && (
        <Card label="PRIVATE_BALANCE — VIEW_KEY_SELF">
          <div className="text-[32px] font-medium tabular-nums">
            {formatUsdc(decrypted)}
          </div>
          <div className="label-mono">CUSDC • BROWSER_TAB_ONLY</div>
        </Card>
      )}

      <Card label="UNWRAP_CUSDC_TO_USDC">
        <p className="label-mono mb-4">
          BURN_CONFIDENTIAL • TEE_FINALIZES_OFF_CHAIN
        </p>
        <form onSubmit={onUnwrap} className="space-y-3">
          <div>
            <label htmlFor="unwrap-amount" className="label-mono block mb-2">AMOUNT_USDC</label>
            <input
              id="unwrap-amount"
              className="w-full bg-bg border border-border px-3 py-2 font-mono text-[12px] focus:outline-none focus:border-accent"
              value={unwrapAmount}
              onChange={(e) => setUnwrapAmount(e.target.value)}
              placeholder="100"
              inputMode="decimal"
            />
            <p className="label-mono-fade mt-2">
              CLEARED_FROM_MEMORY_AFTER_ENCRYPTION
            </p>
          </div>
          <Button
            type="submit"
            disabled={
              !deployed ||
              !isConnected ||
              unwrapPhase === "encrypting" ||
              unwrapPhase === "submitting"
            }
          >
            {unwrapPhase === "encrypting"
              ? "ENCRYPTING…"
              : unwrapPhase === "submitting"
                ? "SUBMITTING…"
                : unwrapPhase === "pending"
                  ? "REQUEST_NEW_UNWRAP"
                  : "UNWRAP_SALARY"}
          </Button>
        </form>
        {unwrapPhase === "pending" && (
          <p className="mt-3 label-mono text-accent">
            &gt; UNWRAP_REQUESTED — USDC_ARRIVES_POST_TEE_FINALIZATION
          </p>
        )}
        {unwrapTx && (
          <a
            href={arbiscanTx(unwrapTx)}
            target="_blank"
            rel="noreferrer"
            className="block mt-2 label-mono hover:text-fg truncate"
          >
            &gt; TX: {truncateHandle(unwrapTx)}
          </a>
        )}
      </Card>

      <Card label="USDC_WALLET_BALANCE_UNENCRYPTED">
        <div className="text-[22px] font-mono tabular-nums">
          {usdcBalance.data !== undefined
            ? formatUsdc(usdcBalance.data as bigint)
            : "—"}
        </div>
        <div className="label-mono">USDC</div>
      </Card>

      {err && <p className="label-mono text-accent break-all">! {err}</p>}
    </div>
  );
}

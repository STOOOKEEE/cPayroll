"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useAccount, useReadContract, useWalletClient, useWriteContract } from "wagmi";
import { ConnectButton } from "@/components/connect-button";
import { Banner } from "@/components/ui/banner";
import { Button } from "@/components/ui/button";
import { Card, CardTitle } from "@/components/ui/card";
import { addresses, cUSDCAbi, isDeployed, usdcAbi } from "@/lib/contracts";
import { arbiscanTx, formatUsdc, parseUsdc, truncateHandle } from "@/lib/format";
import { decryptBalance, encryptAmount } from "@/lib/nox";

type UnwrapPhase = "idle" | "encrypting" | "submitting" | "pending";

export default function EmployeeView() {
  const { address, isConnected } = useAccount();
  const { data: walletClient } = useWalletClient();
  const { writeContractAsync } = useWriteContract();
  const [decrypted, setDecrypted] = useState<bigint | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

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

  // Trust model: clear decrypted plaintext on unmount.
  useEffect(() => {
    return () => setDecrypted(null);
  }, []);

  async function onReveal() {
    setError(null);
    if (!walletClient || !handleQuery.data) {
      setError("Wallet or handle not ready");
      return;
    }
    setBusy(true);
    try {
      const value = await decryptBalance(walletClient, handleQuery.data as `0x${string}`);
      setDecrypted(value);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setBusy(false);
    }
  }

  async function onUnwrap(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setUnwrapTx(null);

    if (!walletClient || !address) {
      setError("Wallet not ready");
      return;
    }

    let amountBig: bigint;
    try {
      amountBig = parseUsdc(unwrapAmount);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
      return;
    }

    try {
      setUnwrapPhase("encrypting");
      const { handle, handleProof } = await encryptAmount(
        walletClient,
        amountBig,
        addresses.cUSDC
      );
      // Clear plaintext input immediately after encryption.
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
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
      setUnwrapPhase("idle");
    }
  }

  function onRefresh() {
    setDecrypted(null);
    handleQuery.refetch();
    usdcBalance.refetch();
  }

  return (
    <main className="p-8 space-y-6 max-w-2xl mx-auto">
      <header className="flex items-center justify-between">
        <h1 className="text-3xl font-bold">Employee view</h1>
        <ConnectButton />
      </header>
      <Link className="text-sm underline" href="/">← Home</Link>

      {!deployed && <Banner tone="warning">Contracts not deployed yet.</Banner>}
      {!isConnected && <Banner tone="info">Connect your wallet.</Banner>}

      <Card>
        <CardTitle>Encrypted balance handle</CardTitle>
        <p className="font-mono text-sm break-all">
          {handleQuery.data ? truncateHandle(handleQuery.data as string) : "—"}
        </p>
        <div className="flex gap-3 mt-4">
          <Button onClick={onReveal} disabled={!isConnected || busy || !handleQuery.data}>
            {busy ? "Decrypting…" : "Reveal my balance"}
          </Button>
          <Button variant="secondary" onClick={onRefresh}>
            Refresh
          </Button>
        </div>
      </Card>

      {decrypted !== null && (
        <Card>
          <CardTitle>Private balance (visible only to you)</CardTitle>
          <p className="font-mono text-2xl">{formatUsdc(decrypted)} cUSDC</p>
          <p className="text-xs text-neutral-500 mt-2">
            Held in this browser tab only. Cleared on navigation.
          </p>
        </Card>
      )}

      <Card>
        <CardTitle>Unwrap cUSDC → USDC</CardTitle>
        <p className="text-sm text-neutral-400 mb-3">
          Burn confidential cUSDC and receive plain USDC. Finalization runs in the Nox TEE
          off-chain — plain USDC arrives in your wallet once the TEE decrypts and posts the
          result.
        </p>
        <form onSubmit={onUnwrap} className="space-y-3">
          <div>
            <label className="block text-sm text-neutral-400 mb-1">
              Amount (USDC, encrypted on submit)
            </label>
            <input
              className="w-full rounded-md bg-neutral-900 border border-neutral-800 px-3 py-2 font-mono text-sm"
              value={unwrapAmount}
              onChange={(ev) => setUnwrapAmount(ev.target.value)}
              placeholder="100"
              inputMode="decimal"
            />
            <p className="text-xs text-neutral-500 mt-1">
              Cleared from memory immediately after encryption.
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
              ? "Encrypting…"
              : unwrapPhase === "submitting"
                ? "Submitting…"
                : unwrapPhase === "pending"
                  ? "Request a new unwrap"
                  : "Unwrap"}
          </Button>
        </form>
        {unwrapPhase === "pending" && (
          <p className="mt-3 text-sm text-amber-400">
            Unwrap requested. The Nox TEE will finalize it asynchronously — plain USDC
            will land in your wallet shortly.
          </p>
        )}
        {unwrapTx && (
          <p className="mt-3 text-sm">
            Tx:{" "}
            <a
              className="underline font-mono"
              href={arbiscanTx(unwrapTx)}
              target="_blank"
              rel="noreferrer"
            >
              {truncateHandle(unwrapTx)}
            </a>
          </p>
        )}
      </Card>

      <Card>
        <CardTitle>Plain USDC in your wallet</CardTitle>
        <p className="font-mono text-lg">
          {usdcBalance.data !== undefined
            ? `${formatUsdc(usdcBalance.data as bigint)} USDC`
            : "—"}
        </p>
      </Card>

      {error && <p className="text-sm text-red-400">{error}</p>}
    </main>
  );
}

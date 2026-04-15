"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useAccount, useReadContract, useWalletClient } from "wagmi";
import { ConnectButton } from "@/components/connect-button";
import { Banner } from "@/components/ui/banner";
import { Button } from "@/components/ui/button";
import { Card, CardTitle } from "@/components/ui/card";
import { addresses, cUSDCAbi, isDeployed } from "@/lib/contracts";
import { formatUsdc, truncateHandle } from "@/lib/format";
import { decryptBalance } from "@/lib/nox";

export default function EmployeeView() {
  const { address, isConnected } = useAccount();
  const { data: walletClient } = useWalletClient();
  const [decrypted, setDecrypted] = useState<bigint | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const deployed = isDeployed();

  const handleQuery = useReadContract({
    address: deployed ? addresses.cUSDC : undefined,
    abi: cUSDCAbi,
    functionName: "confidentialBalanceOf",
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
          <Button
            variant="secondary"
            onClick={() => {
              setDecrypted(null);
              handleQuery.refetch();
            }}
          >
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

      {error && <p className="text-sm text-red-400">{error}</p>}

      <Banner tone="info">Async unwrap (cUSDC → USDC) coming soon.</Banner>
    </main>
  );
}

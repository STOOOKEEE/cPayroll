"use client";

import { useState } from "react";
import { RainbowKitProvider, getDefaultConfig } from "@rainbow-me/rainbowkit";
import "@rainbow-me/rainbowkit/styles.css";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { fallback, http } from "viem";
import { WagmiProvider } from "wagmi";
import { arbitrumSepolia } from "wagmi/chains";
import { env } from "@/lib/env";
import { AppShell } from "./app-shell";
import { ExtensionErrorFilter } from "./extension-error-filter";

// Primary first, then public fallbacks. If the configured RPC is rate-limited
// or CORS-blocked from the browser, wagmi silently retries the next transport.
const customRpc = process.env.NEXT_PUBLIC_ARB_SEPOLIA_RPC;
const transport = fallback(
  [
    customRpc ? http(customRpc) : null,
    http("https://sepolia-rollup.arbitrum.io/rpc"),
    http("https://arbitrum-sepolia.publicnode.com"),
    http("https://arbitrum-sepolia-rpc.publicnode.com"),
  ].filter((x): x is NonNullable<typeof x> => x !== null)
);

const config = getDefaultConfig({
  appName: "cPayroll",
  projectId: env.NEXT_PUBLIC_WALLETCONNECT_ID || "cpayroll-dev",
  chains: [arbitrumSepolia],
  transports: {
    [arbitrumSepolia.id]: transport,
  },
  ssr: false,
});

export default function ClientProvidersInner({
  children,
}: {
  children: React.ReactNode;
}) {
  const [queryClient] = useState(() => new QueryClient());
  return (
    <WagmiProvider config={config}>
      <QueryClientProvider client={queryClient}>
        <RainbowKitProvider modalSize="compact">
          <ExtensionErrorFilter />
          <AppShell>{children}</AppShell>
        </RainbowKitProvider>
      </QueryClientProvider>
    </WagmiProvider>
  );
}

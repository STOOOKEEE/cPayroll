"use client";

import { RainbowKitProvider, getDefaultConfig } from "@rainbow-me/rainbowkit";
import "@rainbow-me/rainbowkit/styles.css";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { http } from "viem";
import { WagmiProvider } from "wagmi";
import { arbitrumSepolia } from "wagmi/chains";
import { env } from "@/lib/env";
import { AppShell } from "./app-shell";

const rpcUrl = process.env.NEXT_PUBLIC_ARB_SEPOLIA_RPC;

const config = getDefaultConfig({
  appName: "cPayroll",
  projectId: env.NEXT_PUBLIC_WALLETCONNECT_ID || "cpayroll-dev",
  chains: [arbitrumSepolia],
  transports: {
    [arbitrumSepolia.id]: http(rpcUrl || undefined),
  },
  ssr: false,
});

const queryClient = new QueryClient();

export default function ClientProvidersInner({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <WagmiProvider config={config}>
      <QueryClientProvider client={queryClient}>
        <RainbowKitProvider modalSize="compact">
          <AppShell>{children}</AppShell>
        </RainbowKitProvider>
      </QueryClientProvider>
    </WagmiProvider>
  );
}

"use client";

import dynamic from "next/dynamic";

/**
 * Defers the wagmi + WalletConnect + RainbowKit stack to the client only.
 * They reach for `indexedDB` / `localStorage` during init, which crashes
 * SSR. Rendering the full app shell only after hydration sidesteps the
 * issue — hackathon-acceptable given we're a signed-in dApp either way.
 */
const Inner = dynamic(() => import("./client-providers-inner"), {
  ssr: false,
  loading: () => (
    <div className="min-h-screen bg-bg text-dim flex items-center justify-center">
      <span className="label-mono">BOOTING_C_PAYROLL…</span>
    </div>
  ),
});

export function ClientProviders({ children }: { children: React.ReactNode }) {
  return <Inner>{children}</Inner>;
}

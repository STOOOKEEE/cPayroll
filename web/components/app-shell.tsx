"use client";

import Link from "next/link";
import type { Route } from "next";
import { usePathname } from "next/navigation";
import { useAccount, useChainId } from "wagmi";
import { ConnectButton } from "./connect-button";

const tabs: { href: Route; label: string }[] = [
  { href: "/", label: "DASHBOARD" },
  { href: "/team" as Route, label: "TEAM" },
  { href: "/treasury" as Route, label: "TREASURY" },
  { href: "/history" as Route, label: "HISTORY" },
  { href: "/employee" as Route, label: "EMPLOYEE" },
  { href: "/deploy" as Route, label: "DEPLOY" },
];

function Brand() {
  return (
    <div className="flex items-center gap-2">
      <svg width="14" height="14" viewBox="0 0 14 14" className="text-fg" aria-hidden="true">
        <path fill="currentColor" d="M0 0h5v5H0zM9 0h5v5H9zM0 9h5v5H0zM9 9h5v5H9z" />
      </svg>
      <span className="label-mono-fg">Confidential Onchain Payroll</span>
      <span className="text-fade">/</span>
      <span className="label-mono">cPayroll Encrypted</span>
    </div>
  );
}

function TopBar() {
  return (
    <header className="flex items-center justify-between border-b border-border px-6 h-12">
      <Brand />
      <ConnectButton />
    </header>
  );
}

function TabBar() {
  const pathname = usePathname();
  const chainId = useChainId();
  const { isConnected } = useAccount();

  const networkLabel =
    chainId === 421614 ? "ARB_SEPOLIA" : chainId ? `CHAIN_${chainId}` : "OFFLINE";

  return (
    <nav className="flex items-center justify-between border-b border-border px-6 h-14 overflow-x-auto">
      <div className="flex items-center gap-4 shrink-0">
        <span className="text-accent text-[15px] font-medium tracking-wider2 mr-2">
          C_PAYROLL
        </span>
        {tabs.map((t) => {
          const active = pathname === t.href;
          return (
            <Link
              key={String(t.href)}
              href={t.href}
              className={`px-4 py-1.5 border text-[11px] uppercase tracking-wider2 transition ${
                active
                  ? "bg-accent border-accent text-fg"
                  : "bg-transparent border-border text-fg hover:border-fade"
              }`}
            >
              {t.label}
            </Link>
          );
        })}
      </div>
      <div className="flex items-center gap-3">
        <span className="label-mono">NETWORK:</span>
        <span
          className={`label-mono-fg ${
            isConnected ? "text-fg" : "text-fade"
          }`}
        >
          {networkLabel}
        </span>
      </div>
    </nav>
  );
}

export function AppShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-bg text-fg">
      <TopBar />
      <TabBar />
      <main className="min-h-[calc(100vh-104px)]">{children}</main>
    </div>
  );
}

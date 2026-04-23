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
];

function Brand() {
  return (
    <div className="flex items-center gap-2">
      <svg width="14" height="14" viewBox="0 0 14 14" className="text-fg">
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
      <div className="flex items-center gap-3">
        <button className="label-mono-fade hover:text-fg" aria-label="menu">…</button>
        <button className="label-mono-fade hover:text-fg" aria-label="bookmark">
          <svg width="12" height="14" viewBox="0 0 12 14" fill="none" stroke="currentColor">
            <path d="M1 1h10v12l-5-3-5 3z" />
          </svg>
        </button>
        <ConnectButton />
      </div>
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
    <nav className="flex items-center justify-between border-b border-border px-6 h-14">
      <div className="flex items-center gap-4">
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

function SideRail() {
  return (
    <aside className="w-12 border-r border-border flex flex-col items-center py-4 gap-6 text-dim">
      <button className="hover:text-fg" aria-label="edit">
        <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor">
          <path d="M2 14h12M10 2l4 4-8 8H2v-4z" />
        </svg>
      </button>
      <button className="hover:text-fg" aria-label="explore">
        <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor">
          <circle cx="8" cy="8" r="6" />
          <path d="M11 5L9 9l-4 2 2-4z" fill="currentColor" />
        </svg>
      </button>
      <button className="hover:text-fg" aria-label="files">
        <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor">
          <path d="M2 4h4l2 2h6v8H2z" />
        </svg>
      </button>
      <button className="hover:text-fg" aria-label="bookmarks">
        <svg width="14" height="16" viewBox="0 0 14 16" fill="none" stroke="currentColor">
          <path d="M2 1h10v14l-5-3-5 3z" />
        </svg>
      </button>
      <div className="flex-1" />
      <div
        className="w-6 h-6 border border-border"
        title="status"
        aria-hidden
      />
    </aside>
  );
}

export function AppShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-bg text-fg">
      <TopBar />
      <TabBar />
      <div className="flex">
        <SideRail />
        <main className="flex-1 min-h-[calc(100vh-104px)]">{children}</main>
      </div>
    </div>
  );
}

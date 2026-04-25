"use client";

import Link from "next/link";
import type { Route } from "next";
import { useConnectModal } from "@rainbow-me/rainbowkit";

const FEATURES = [
  {
    title: "ENCRYPTED_SALARIES",
    desc: "Salaries are encrypted client-side before hitting the chain. Only the employer and the employee can decrypt — never a third party, never a block explorer.",
    tag: "ERC-7984",
  },
  {
    title: "ONE_CLICK_PAYROLL",
    desc: "Batch-pay your entire team in a single transaction. Each employee receives a confidential transfer — observers see who was paid, never how much.",
    tag: "NOX_TEE",
  },
  {
    title: "ON_CHAIN_AUDIT_TRAIL",
    desc: "Every payment, every hire, every deposit is logged on-chain with timestamps. Full accountability without leaking compensation data.",
    tag: "ARBITRUM",
  },
];

const TECH = [
  { label: "iExec Nox", desc: "Confidential compute (TEE)" },
  { label: "ERC-7984", desc: "Encrypted token standard" },
  { label: "Arbitrum Sepolia", desc: "L2 testnet" },
  { label: "ChainGPT", desc: "AI contract audit" },
];

export function Landing() {
  const { openConnectModal } = useConnectModal();

  return (
    <div className="min-h-[calc(100vh-104px)] flex flex-col">
      {/* Hero */}
      <section className="flex-1 flex flex-col items-center justify-center px-6 py-20 text-center">
        <div className="space-y-6 max-w-2xl">
          <div className="inline-block px-3 py-1 border border-accent text-accent text-[10px] uppercase tracking-wider2">
            iExec Vibe Coding Challenge
          </div>

          <h1 className="text-[32px] sm:text-[42px] font-medium leading-tight tracking-tight uppercase">
            Confidential
            <br />
            <span className="text-accent">Onchain Payroll</span>
          </h1>

          <p className="text-dim text-[13px] leading-relaxed max-w-lg mx-auto">
            Pay your team in crypto without exposing salaries on-chain.
            Amounts are encrypted end-to-end via ERC-7984 confidential tokens —
            only the concerned parties can read them.
          </p>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 pt-4">
            <button
              onClick={openConnectModal}
              className="px-8 py-3 bg-accent text-fg text-[12px] uppercase tracking-wider2 hover:bg-accent-hover transition"
            >
              Connect Wallet
            </button>
            <Link
              href={"/employee" as Route}
              className="px-8 py-3 border border-border text-fg text-[12px] uppercase tracking-wider2 hover:border-fade transition"
            >
              I'm an Employee
            </Link>
          </div>

          <p className="label-mono pt-2">
            Employer? Connect your wallet to access the dashboard.
          </p>
        </div>
      </section>

      {/* Features */}
      <section className="border-t border-border px-6 py-16">
        <div className="max-w-5xl mx-auto">
          <div className="label-mono-fade mb-8 text-center">HOW_IT_WORKS</div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {FEATURES.map((f) => (
              <div key={f.title} className="border border-border p-6 space-y-3">
                <div className="flex items-center justify-between">
                  <h3 className="text-[13px] uppercase tracking-wider2 text-fg font-medium">
                    {f.title}
                  </h3>
                  <span className="text-[9px] uppercase tracking-wider2 text-accent border border-accent px-2 py-0.5">
                    {f.tag}
                  </span>
                </div>
                <p className="text-dim text-[11px] leading-relaxed">{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Privacy model */}
      <section className="border-t border-border px-6 py-12">
        <div className="max-w-3xl mx-auto">
          <div className="label-mono-fade mb-6 text-center">PRIVACY_MODEL</div>
          <div className="border border-border">
            <div className="grid grid-cols-3 border-b border-border">
              <div className="p-3 label-mono-fg border-r border-border">DATA</div>
              <div className="p-3 label-mono-fg border-r border-border">ON_CHAIN</div>
              <div className="p-3 label-mono-fg">WHO_CAN_READ</div>
            </div>
            {[
              ["Employee addresses", "Public", "Everyone"],
              ["Payment timestamps", "Public", "Everyone"],
              ["Salary amounts", "Encrypted", "Owner + Employee"],
              ["Balances", "Encrypted", "Employee only"],
              ["Payment amounts", "Encrypted", "Owner + Recipient"],
            ].map(([data, chain, who]) => (
              <div key={data} className="grid grid-cols-3 border-b border-border last:border-b-0">
                <div className="p-3 text-[11px] text-fg border-r border-border">{data}</div>
                <div className={`p-3 text-[11px] border-r border-border ${chain === "Encrypted" ? "text-accent" : "text-dim"}`}>
                  {chain}
                </div>
                <div className="p-3 text-[11px] text-dim">{who}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Tech stack */}
      <section className="border-t border-border px-6 py-12">
        <div className="max-w-3xl mx-auto">
          <div className="label-mono-fade mb-6 text-center">BUILT_WITH</div>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            {TECH.map((t) => (
              <div key={t.label} className="border border-border p-4 text-center space-y-1">
                <div className="text-[12px] uppercase tracking-wider2 text-fg">{t.label}</div>
                <div className="text-[10px] text-dim">{t.desc}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-border px-6 py-6 text-center">
        <p className="label-mono">
          cPayroll — Confidential Onchain Payroll — Arbitrum Sepolia
        </p>
      </footer>
    </div>
  );
}

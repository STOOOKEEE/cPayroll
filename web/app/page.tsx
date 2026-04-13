import Link from "next/link";
import { ConnectButton } from "@/components/connect-button";

export default function Home() {
  return (
    <main className="min-h-screen flex flex-col items-center justify-center gap-8 p-8">
      <h1 className="text-5xl font-bold tracking-tight">cPayroll</h1>
      <p className="text-neutral-400 max-w-xl text-center">
        Confidential on-chain payroll for DAOs. Salaries encrypted via ERC-7984 on iExec Nox,
        settled on Arbitrum Sepolia.
      </p>
      <ConnectButton />
      <div className="flex gap-4 text-sm">
        <Link className="underline" href="/employer">Employer dashboard</Link>
        <Link className="underline" href="/employee">Employee view</Link>
      </div>
    </main>
  );
}

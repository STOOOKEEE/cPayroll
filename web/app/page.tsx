"use client";

import { useAccount } from "wagmi";
import { TreasuryCard } from "@/components/dashboard/treasury-card";
import { PayrollRunCard } from "@/components/dashboard/payroll-run-card";
import { SystemLogs } from "@/components/dashboard/system-logs";
import { ActivePersonnel } from "@/components/dashboard/active-personnel";
import { EmployeePreview } from "@/components/dashboard/employee-preview";
import { Landing } from "@/components/landing";

export default function HomePage() {
  const { isConnected } = useAccount();

  if (!isConnected) return <Landing />;

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 min-h-[calc(100vh-104px)]">
      <section className="lg:col-span-3 border-b lg:border-b-0 lg:border-r border-border py-6 space-y-6">
        <div className="px-5">
          <div className="label-mono-fade mb-3">TREASURY_OVERVIEW</div>
        </div>
        <div className="px-5"><TreasuryCard /></div>
        <div className="px-5"><PayrollRunCard /></div>
        <SystemLogs />
      </section>

      <section className="lg:col-span-6 py-6">
        <ActivePersonnel />
      </section>

      <section className="hidden lg:block lg:col-span-3 border-l border-border py-6">
        <EmployeePreview />
      </section>
    </div>
  );
}

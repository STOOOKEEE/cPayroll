"use client";

import { useState, type ReactNode } from "react";

export type ModalProps = {
  open: boolean;
  onClose: () => void;
  title: string;
  children: ReactNode;
};

export function Modal({ open, onClose, title, children }: ModalProps) {
  if (!open) return null;
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4"
      onClick={onClose}
    >
      <div
        className="max-h-[85vh] w-full max-w-2xl overflow-y-auto rounded-lg border border-neutral-800 bg-neutral-950 p-6 shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-xl font-bold">{title}</h2>
          <button
            onClick={onClose}
            className="text-neutral-400 hover:text-white"
            aria-label="Close"
          >
            ✕
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}

type Severity = "low" | "medium" | "high" | "critical" | "unknown";

const SEVERITY_COLORS: Record<Severity, string> = {
  low: "bg-green-900 text-green-200",
  medium: "bg-yellow-900 text-yellow-200",
  high: "bg-orange-900 text-orange-200",
  critical: "bg-red-900 text-red-200",
  unknown: "bg-neutral-800 text-neutral-300",
};

export type AuditReportView = {
  summary: string;
  severity: Severity;
  findings: { title: string; severity: string; description: string }[];
  raw: string;
};

export function AuditReportBody({ report }: { report: AuditReportView }) {
  const [showRaw, setShowRaw] = useState(false);
  return (
    <div className="space-y-4 text-sm">
      <div>
        <span
          className={`inline-block rounded px-2 py-1 text-xs font-semibold uppercase ${
            SEVERITY_COLORS[report.severity] ?? SEVERITY_COLORS.unknown
          }`}
        >
          {report.severity}
        </span>
      </div>
      <div>
        <h3 className="font-semibold text-neutral-200">Summary</h3>
        <p className="mt-1 text-neutral-400">{report.summary}</p>
      </div>
      <div>
        <h3 className="font-semibold text-neutral-200">
          Findings ({report.findings.length})
        </h3>
        {report.findings.length === 0 ? (
          <p className="mt-1 text-neutral-500">No findings reported.</p>
        ) : (
          <ul className="mt-2 space-y-2">
            {report.findings.map((f, i) => (
              <li
                key={i}
                className="rounded border border-neutral-800 p-3"
              >
                <div className="flex items-center justify-between">
                  <span className="font-semibold">{f.title}</span>
                  <span className="text-xs text-neutral-400">{f.severity}</span>
                </div>
                {f.description && (
                  <p className="mt-1 text-neutral-400">{f.description}</p>
                )}
              </li>
            ))}
          </ul>
        )}
      </div>
      <div>
        <button
          onClick={() => setShowRaw((v) => !v)}
          className="text-xs text-neutral-400 underline"
        >
          {showRaw ? "Hide" : "Show"} raw response
        </button>
        {showRaw && (
          <pre className="mt-2 max-h-64 overflow-auto rounded bg-neutral-900 p-2 text-xs text-neutral-300">
            {report.raw}
          </pre>
        )}
      </div>
    </div>
  );
}

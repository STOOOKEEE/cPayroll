"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";

export type ModalProps = {
  open: boolean;
  onClose: () => void;
  title: string;
  children: ReactNode;
};

export function Modal({ open, onClose, title, children }: ModalProps) {
  const dialogRef = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    const el = dialogRef.current;
    if (!el) return;
    if (open && !el.open) el.showModal();
    if (!open && el.open) el.close();
  }, [open]);

  return (
    <dialog
      ref={dialogRef}
      onClose={onClose}
      className="backdrop:bg-black/70 bg-transparent p-4 max-w-2xl w-full m-auto"
      aria-labelledby="modal-title"
    >
      <div className="max-h-[85vh] overflow-y-auto border border-border bg-surface p-6 shadow-xl">
        <div className="mb-4 flex items-center justify-between">
          <h2 id="modal-title" className="text-[13px] uppercase tracking-wider2 font-medium text-fg">
            {title}
          </h2>
          <button
            onClick={onClose}
            className="text-dim hover:text-fg"
            aria-label="Close"
          >
            ✕
          </button>
        </div>
        {children}
      </div>
    </dialog>
  );
}

type Severity = "low" | "medium" | "high" | "critical" | "unknown";

const SEVERITY_COLORS: Record<Severity, string> = {
  low: "bg-bg text-fg border border-border",
  medium: "bg-bg text-accent border border-border",
  high: "bg-accent-dark text-fg border border-accent",
  critical: "bg-accent text-fg border border-accent",
  unknown: "bg-surface text-dim border border-border",
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
    <div className="space-y-4 text-[12px] font-mono">
      <div>
        <span
          className={`inline-block px-2 py-1 text-[10px] uppercase tracking-wider2 ${
            SEVERITY_COLORS[report.severity] ?? SEVERITY_COLORS.unknown
          }`}
        >
          {report.severity}
        </span>
      </div>
      <div>
        <h3 className="label-mono-fg">Summary</h3>
        <p className="mt-1 text-dim">{report.summary}</p>
      </div>
      <div>
        <h3 className="label-mono-fg">
          Findings ({report.findings.length})
        </h3>
        {report.findings.length === 0 ? (
          <p className="mt-1 text-dim">No findings reported.</p>
        ) : (
          <ul className="mt-2 space-y-2">
            {report.findings.map((f, i) => (
              <li
                key={i}
                className="border border-border p-3"
              >
                <div className="flex items-center justify-between">
                  <span className="text-fg">{f.title}</span>
                  <span className="label-mono">{f.severity}</span>
                </div>
                {f.description && (
                  <p className="mt-1 text-dim">{f.description}</p>
                )}
              </li>
            ))}
          </ul>
        )}
      </div>
      <div>
        <button
          onClick={() => setShowRaw((v) => !v)}
          className="label-mono hover:text-fg underline"
        >
          {showRaw ? "Hide" : "Show"} raw response
        </button>
        {showRaw && (
          <pre className="mt-2 max-h-64 overflow-auto bg-bg border border-border p-2 text-[11px] text-dim">
            {report.raw}
          </pre>
        )}
      </div>
    </div>
  );
}

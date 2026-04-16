/**
 * Server-only ChainGPT client. Never import from a client component — the API
 * key must stay on the server. Request credits via @vladnazarxyz on Telegram.
 */

import "server-only";

export type AuditFinding = {
  title: string;
  severity: string;
  description: string;
};

export type AuditReport = {
  summary: string;
  severity: "low" | "medium" | "high" | "critical" | "unknown";
  findings: AuditFinding[];
  raw: string;
};

const VALID_SEVERITIES = ["low", "medium", "high", "critical"] as const;

function normalizeSeverity(value: unknown): AuditReport["severity"] {
  if (typeof value !== "string") return "unknown";
  const v = value.toLowerCase().trim();
  return (VALID_SEVERITIES as readonly string[]).includes(v)
    ? (v as AuditReport["severity"])
    : "unknown";
}

function coerceFindings(value: unknown): AuditFinding[] {
  if (!Array.isArray(value)) return [];
  return value
    .map((f): AuditFinding | null => {
      if (!f || typeof f !== "object") return null;
      const obj = f as Record<string, unknown>;
      const title =
        typeof obj.title === "string"
          ? obj.title
          : typeof obj.name === "string"
            ? obj.name
            : "Untitled finding";
      const severity =
        typeof obj.severity === "string" ? obj.severity : "unknown";
      const description =
        typeof obj.description === "string"
          ? obj.description
          : typeof obj.detail === "string"
            ? obj.detail
            : "";
      return { title, severity, description };
    })
    .filter((x): x is AuditFinding => x !== null);
}

export async function auditContract(args: {
  contractName: string;
  source: string;
}): Promise<AuditReport> {
  const key = process.env.CHAINGPT_API_KEY;
  if (!key) {
    throw new Error(
      "CHAINGPT_API_KEY not set — request credits from @vladnazarxyz on Telegram"
    );
  }

  const url =
    process.env.CHAINGPT_AUDIT_URL ?? "https://api.chaingpt.org/v1/audit";

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 60_000);

  try {
    // TODO(chaingpt): verify against https://docs.chaingpt.org/ — body shape
    // and response schema are best-effort guesses until the real key + docs
    // are available. Update field names if the live API differs.
    const res = await fetch(url, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${key}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "smart-contract-auditor",
        contractName: args.contractName,
        code: args.source,
      }),
      signal: controller.signal,
    });

    const raw = await res.text();
    if (!res.ok) {
      throw new Error(`ChainGPT API ${res.status}: ${raw.slice(0, 200)}`);
    }

    let parsed: unknown;
    try {
      parsed = JSON.parse(raw);
    } catch {
      return {
        summary: "Unparsed response",
        severity: "unknown",
        findings: [],
        raw,
      };
    }

    if (!parsed || typeof parsed !== "object") {
      return {
        summary: "Unparsed response",
        severity: "unknown",
        findings: [],
        raw,
      };
    }

    const obj = parsed as Record<string, unknown>;
    const data = (obj.data ?? obj.report ?? obj) as Record<string, unknown>;

    const summary =
      typeof data.summary === "string"
        ? data.summary
        : typeof data.overview === "string"
          ? data.overview
          : "No summary returned by ChainGPT.";
    const severity = normalizeSeverity(
      data.severity ?? data.overallSeverity ?? data.risk
    );
    const findings = coerceFindings(
      data.findings ?? data.issues ?? data.vulnerabilities
    );

    return { summary, severity, findings, raw };
  } finally {
    clearTimeout(timeout);
  }
}

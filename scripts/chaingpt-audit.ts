/**
 * Build-time ChainGPT Smart Contract Auditor CLI.
 *
 * Reads contracts/src/Payroll.sol and contracts/src/CUSDC.sol, posts to the
 * ChainGPT API, and writes a markdown report at audits/chaingpt-payroll.md.
 *
 * Usage:
 *   CHAINGPT_API_KEY=... pnpm audit
 *
 * If CHAINGPT_API_KEY is missing, writes a placeholder and exits 0 (don't
 * fail the build).
 */

import { execSync } from "node:child_process";
import { promises as fs } from "node:fs";
import path from "node:path";

const ROOT = path.resolve(__dirname, "..");
const CONTRACTS = ["Payroll.sol", "CUSDC.sol"];
const OUTPUT = path.join(ROOT, "audits", "chaingpt-payroll.md");

const PLACEHOLDER = `# ChainGPT Audit Report — cPayroll (placeholder)

> ⚠️ No \`CHAINGPT_API_KEY\` set at build time. This file will be regenerated
> once the key is configured. Request credits from @vladnazarxyz on Telegram.

The script that generates this report lives at \`scripts/chaingpt-audit.ts\`.
Run it with: \`CHAINGPT_API_KEY=... pnpm audit\`.
`;

type Finding = { title: string; severity: string; description: string };
type Report = {
  summary: string;
  severity: string;
  findings: Finding[];
  raw: unknown;
};

async function readContract(name: string): Promise<string> {
  return fs.readFile(path.join(ROOT, "contracts", "src", name), "utf8");
}

function gitShortSha(): string {
  try {
    return execSync("git rev-parse --short HEAD", { cwd: ROOT })
      .toString()
      .trim();
  } catch {
    return "n/a";
  }
}

function normalizeSeverity(value: unknown): string {
  if (typeof value !== "string") return "unknown";
  const v = value.toLowerCase().trim();
  return ["low", "medium", "high", "critical"].includes(v) ? v : "unknown";
}

function coerceFindings(value: unknown): Finding[] {
  if (!Array.isArray(value)) return [];
  return value
    .map((f): Finding | null => {
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
    .filter((x): x is Finding => x !== null);
}

async function callChainGPT(
  contractName: string,
  source: string,
  key: string
): Promise<Report> {
  const url =
    process.env.CHAINGPT_AUDIT_URL ?? "https://api.chaingpt.org/v1/audit";

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 60_000);

  try {
    // TODO(chaingpt): verify against https://docs.chaingpt.org/
    const res = await fetch(url, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${key}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "smart-contract-auditor",
        contractName,
        code: source,
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

    const obj = (parsed && typeof parsed === "object"
      ? parsed
      : {}) as Record<string, unknown>;
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

    return { summary, severity, findings, raw: parsed };
  } finally {
    clearTimeout(timeout);
  }
}

function renderMarkdown(reports: { name: string; report: Report }[]): string {
  const date = new Date().toISOString();
  const sha = gitShortSha();

  // Pick worst severity across reports
  const order = ["low", "medium", "high", "critical"];
  const worst = reports.reduce((acc, r) => {
    const i = order.indexOf(r.report.severity);
    return i > acc ? i : acc;
  }, -1);
  const overall = worst >= 0 ? order[worst] : "unknown";

  const summary = reports
    .map((r) => `### ${r.name}\n\n${r.report.summary}`)
    .join("\n\n");

  const allFindings = reports.flatMap((r) =>
    r.report.findings.map((f) => ({ contract: r.name, ...f }))
  );

  const findingsTable =
    allFindings.length === 0
      ? "_No findings reported._"
      : [
          "| # | Contract | Title | Severity | Description |",
          "|---|---|---|---|---|",
          ...allFindings.map(
            (f, i) =>
              `| ${i + 1} | ${f.contract} | ${f.title} | ${f.severity} | ${f.description.replace(/\n/g, " ")} |`
          ),
        ].join("\n");

  const rawJson = JSON.stringify(
    reports.map((r) => ({ contract: r.name, raw: r.report.raw })),
    null,
    2
  );

  return `# ChainGPT Audit Report — cPayroll

_Generated automatically via ChainGPT Smart Contract Auditor._

- **Date:** ${date}
- **Commit:** ${sha}
- **Contracts audited:** ${reports.map((r) => r.name).join(", ")}

## Overall severity
**${overall}**

## Summary
${summary}

## Findings
${findingsTable}

## Raw API response
<details><summary>Click to expand</summary>

\`\`\`json
${rawJson}
\`\`\`
</details>
`;
}

async function main() {
  await fs.mkdir(path.dirname(OUTPUT), { recursive: true });
  const key = process.env.CHAINGPT_API_KEY;
  if (!key) {
    console.warn(
      "[chaingpt-audit] CHAINGPT_API_KEY not set — writing placeholder."
    );
    await fs.writeFile(OUTPUT, PLACEHOLDER, "utf8");
    process.exit(0);
  }

  const reports: { name: string; report: Report }[] = [];
  for (const file of CONTRACTS) {
    const source = await readContract(file);
    const name = file.replace(/\.sol$/, "");
    console.log(`[chaingpt-audit] auditing ${file}…`);
    const report = await callChainGPT(name, source, key);
    reports.push({ name: file, report });
  }

  const md = renderMarkdown(reports);
  await fs.writeFile(OUTPUT, md, "utf8");
  console.log(`[chaingpt-audit] wrote ${OUTPUT}`);
}

main().catch((err) => {
  console.error("[chaingpt-audit] failed:", err);
  process.exit(1);
});

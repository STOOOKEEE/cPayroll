import { promises as fs } from "node:fs";
import path from "node:path";
import { NextResponse } from "next/server";
import { z } from "zod";
import { auditContract } from "@/lib/chaingpt";

// SECURITY: this endpoint audits Solidity source only. Never forward encrypted
// amounts or salary data here.

export const runtime = "nodejs";

const BodySchema = z.object({
  contractName: z
    .string()
    .min(1)
    .max(100)
    .regex(/^[A-Za-z0-9_]+$/, "contractName must be alphanumeric/underscore"),
  source: z.string().min(10).max(100_000).optional(),
});

// TODO: use Redis/KV in prod — this resets on cold start
const RATE_LIMIT_MAX = 5;
const RATE_LIMIT_WINDOW_MS = 5 * 60 * 1000;
const rateLimitMap = new Map<string, { count: number; resetAt: number }>();

function checkRateLimit(ip: string): boolean {
  const now = Date.now();
  const entry = rateLimitMap.get(ip);
  if (!entry || entry.resetAt < now) {
    rateLimitMap.set(ip, { count: 1, resetAt: now + RATE_LIMIT_WINDOW_MS });
    return true;
  }
  if (entry.count >= RATE_LIMIT_MAX) return false;
  entry.count += 1;
  return true;
}

const CONTRACTS_DIR = path.resolve(process.cwd(), "..", "contracts", "src");

async function loadContractSource(contractName: string): Promise<string> {
  const filePath = path.resolve(CONTRACTS_DIR, `${contractName}.sol`);
  if (!filePath.startsWith(CONTRACTS_DIR + path.sep)) {
    throw new Error("Path traversal blocked");
  }
  return fs.readFile(filePath, "utf8");
}

export async function POST(req: Request) {
  const ip =
    req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ??
    req.headers.get("x-real-ip") ??
    "unknown";
  if (!checkRateLimit(ip)) {
    return NextResponse.json(
      { error: "Rate limit exceeded — try again in a few minutes" },
      { status: 429 }
    );
  }

  const json = await req.json().catch(() => ({}));
  const parsed = BodySchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues.map((i) => i.message).join("; ") },
      { status: 400 }
    );
  }

  const { contractName } = parsed.data;
  let source = parsed.data.source;
  if (!source) {
    try {
      source = await loadContractSource(contractName);
    } catch (err) {
      return NextResponse.json(
        {
          error: `Could not read contract ${contractName}.sol: ${
            (err as Error).message
          }`,
        },
        { status: 404 }
      );
    }
  }

  try {
    const report = await auditContract({ contractName, source });
    return NextResponse.json({ report }, { status: 200 });
  } catch (err) {
    return NextResponse.json(
      { error: (err as Error).message },
      { status: 500 }
    );
  }
}

export async function GET() {
  return NextResponse.json({ error: "Method not allowed" }, { status: 405 });
}

export async function PUT() {
  return NextResponse.json({ error: "Method not allowed" }, { status: 405 });
}

export async function DELETE() {
  return NextResponse.json({ error: "Method not allowed" }, { status: 405 });
}

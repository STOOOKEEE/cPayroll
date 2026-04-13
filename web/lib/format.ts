const ARBISCAN = "https://sepolia.arbiscan.io";

export function truncateAddress(addr: string | undefined | null): string {
  if (!addr) return "—";
  if (addr.length <= 10) return addr;
  return `${addr.slice(0, 6)}…${addr.slice(-4)}`;
}

export function truncateHandle(handle: string | undefined | null): string {
  if (!handle) return "—";
  if (handle.length <= 14) return handle;
  return `${handle.slice(0, 10)}…${handle.slice(-4)}`;
}

export function arbiscanTx(hash: string): string {
  return `${ARBISCAN}/tx/${hash}`;
}

export function arbiscanAddress(addr: string): string {
  return `${ARBISCAN}/address/${addr}`;
}

export function formatTimestamp(seconds: bigint | number): string {
  const s = typeof seconds === "bigint" ? Number(seconds) : seconds;
  if (!s) return "never";
  return new Date(s * 1000).toLocaleString();
}

export function formatUsdc(amount: bigint): string {
  const whole = amount / 1_000_000n;
  const frac = amount % 1_000_000n;
  return `${whole.toString()}.${frac.toString().padStart(6, "0")}`;
}

export function parseUsdc(input: string): bigint {
  const trimmed = input.trim();
  if (!trimmed) throw new Error("Empty amount");
  const [whole, frac = ""] = trimmed.split(".");
  if (!/^\d+$/.test(whole)) throw new Error("Invalid amount");
  if (frac && !/^\d+$/.test(frac)) throw new Error("Invalid amount");
  const fracPadded = (frac + "000000").slice(0, 6);
  return BigInt(whole) * 1_000_000n + BigInt(fracPadded);
}

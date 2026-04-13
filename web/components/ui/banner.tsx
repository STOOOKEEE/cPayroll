import * as React from "react";

type Tone = "warning" | "info" | "error";

const tones: Record<Tone, string> = {
  warning: "border-amber-700 bg-amber-950/40 text-amber-200",
  info: "border-sky-800 bg-sky-950/40 text-sky-200",
  error: "border-red-800 bg-red-950/40 text-red-200",
};

export function Banner({
  tone = "info",
  children,
}: {
  tone?: Tone;
  children: React.ReactNode;
}) {
  return (
    <div className={`rounded-md border px-4 py-3 text-sm ${tones[tone]}`}>{children}</div>
  );
}

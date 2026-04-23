import * as React from "react";

type Tone = "warning" | "info" | "error";

const tones: Record<Tone, string> = {
  warning: "border-accent text-accent",
  info: "border-border text-fg",
  error: "border-accent-hover text-accent",
};

const prefixes: Record<Tone, string> = {
  warning: "⚠  WARN",
  info: ">  INFO",
  error: "!  ERROR",
};

export function Banner({
  tone = "info",
  children,
}: {
  tone?: Tone;
  children: React.ReactNode;
}) {
  return (
    <div className={`border px-4 py-3 text-xs uppercase tracking-wider2 ${tones[tone]}`}>
      <span className="mr-3 opacity-70">{prefixes[tone]}</span>
      {children}
    </div>
  );
}

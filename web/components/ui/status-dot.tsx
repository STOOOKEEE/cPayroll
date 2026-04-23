type Tone = "active" | "pending" | "off";

const colors: Record<Tone, string> = {
  active: "bg-accent",
  pending: "bg-fade",
  off: "bg-border",
};

export function StatusDot({ tone = "active" }: { tone?: Tone }) {
  return <span className={`inline-block w-2 h-2 ${colors[tone]}`} aria-hidden />;
}

export function StatusBadge({
  tone = "active",
  label,
}: {
  tone?: Tone;
  label: string;
}) {
  return (
    <span className="inline-flex items-center gap-2">
      <StatusDot tone={tone} />
      <span className="label-mono-fg">{label}</span>
    </span>
  );
}

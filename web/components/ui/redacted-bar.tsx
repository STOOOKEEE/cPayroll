export function RedactedBar({ width = 96 }: { width?: number }) {
  return (
    <span
      className="inline-block bg-redact h-3 align-middle"
      style={{ width: `${width}px` }}
      aria-label="redacted"
    />
  );
}

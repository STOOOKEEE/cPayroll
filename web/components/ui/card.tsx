import * as React from "react";

export function Card({
  className = "",
  label,
  children,
}: {
  className?: string;
  label?: string;
  children: React.ReactNode;
}) {
  return (
    <section className={`border border-border bg-bg ${className}`}>
      {label && (
        <div className="px-5 pt-4">
          <span className="label-mono-fade">{label}</span>
        </div>
      )}
      <div className="p-5">{children}</div>
    </section>
  );
}

export function CardTitle({ children }: { children: React.ReactNode }) {
  return (
    <h2 className="text-[15px] uppercase tracking-wider2 text-fg mb-3 font-medium">
      {children}
    </h2>
  );
}

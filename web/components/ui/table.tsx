import * as React from "react";

export function Table({ children }: { children: React.ReactNode }) {
  return <table className="w-full border-collapse">{children}</table>;
}

export function THead({ children }: { children: React.ReactNode }) {
  return (
    <thead className="text-left border-b border-border">{children}</thead>
  );
}

export function TBody({ children }: { children: React.ReactNode }) {
  return <tbody>{children}</tbody>;
}

export function TR({ children }: { children: React.ReactNode }) {
  return <tr className="border-b border-border last:border-b-0 hover:bg-surface">{children}</tr>;
}

export function TH({ children }: { children: React.ReactNode }) {
  return (
    <th className="py-3 px-2 text-[10px] uppercase tracking-wider2 text-dim font-normal">
      {children}
    </th>
  );
}

export function TD({
  children,
  className = "",
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return <td className={`py-4 px-2 text-[13px] ${className}`}>{children}</td>;
}

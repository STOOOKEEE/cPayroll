import * as React from "react";

export function Table({ children }: { children: React.ReactNode }) {
  return <table className="w-full text-sm border-collapse">{children}</table>;
}

export function THead({ children }: { children: React.ReactNode }) {
  return (
    <thead className="text-left text-neutral-400 border-b border-neutral-800">
      {children}
    </thead>
  );
}

export function TBody({ children }: { children: React.ReactNode }) {
  return <tbody>{children}</tbody>;
}

export function TR({ children }: { children: React.ReactNode }) {
  return <tr className="border-b border-neutral-900">{children}</tr>;
}

export function TH({ children }: { children: React.ReactNode }) {
  return <th className="py-2 px-2 font-medium">{children}</th>;
}

export function TD({
  children,
  className = "",
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return <td className={`py-2 px-2 ${className}`}>{children}</td>;
}

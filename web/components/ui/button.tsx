"use client";

import * as React from "react";

type Variant = "primary" | "secondary" | "ghost" | "danger";

const base =
  "inline-flex items-center justify-center px-4 py-2 text-[11px] uppercase tracking-wider2 font-medium transition disabled:cursor-not-allowed disabled:opacity-40 border";

const variants: Record<Variant, string> = {
  primary: "bg-accent text-fg border-accent hover:bg-accent-hover hover:border-accent-hover",
  secondary: "bg-transparent text-fg border-border hover:border-fade",
  ghost: "bg-transparent text-dim border-transparent hover:text-fg",
  danger: "bg-accent-dark text-fg border-accent-dark hover:bg-accent",
};

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
}

export function Button({ variant = "primary", className = "", ...rest }: ButtonProps) {
  return <button className={`${base} ${variants[variant]} ${className}`} {...rest} />;
}

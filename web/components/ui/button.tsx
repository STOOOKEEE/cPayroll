"use client";

import * as React from "react";

type Variant = "primary" | "secondary" | "danger";

const base =
  "inline-flex items-center justify-center rounded-md px-4 py-2 text-sm font-medium transition disabled:cursor-not-allowed disabled:opacity-50";

const variants: Record<Variant, string> = {
  primary: "bg-white text-black hover:bg-neutral-200",
  secondary: "bg-neutral-800 text-white hover:bg-neutral-700 border border-neutral-700",
  danger: "bg-red-600 text-white hover:bg-red-500",
};

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
}

export function Button({ variant = "primary", className = "", ...rest }: ButtonProps) {
  return <button className={`${base} ${variants[variant]} ${className}`} {...rest} />;
}

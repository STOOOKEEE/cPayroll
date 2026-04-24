"use client";

import { useEffect, useState } from "react";
import { isAddress } from "viem";
import { addresses } from "./contracts";

const STORAGE_KEY = "cpayroll:active";

/**
 * Returns the Payroll address the UI should operate on.
 * Precedence: localStorage override (set on /deploy) → env default.
 * The override lets a user spin up their own clone via the factory and
 * point the rest of the dApp at it without touching .env.
 */
export function useActivePayroll(): {
  address: `0x${string}`;
  isCustom: boolean;
  setActive: (addr: `0x${string}`) => void;
  clearActive: () => void;
} {
  const [override, setOverride] = useState<`0x${string}` | null>(null);

  useEffect(() => {
    try {
      const stored = window.localStorage.getItem(STORAGE_KEY);
      if (stored && isAddress(stored)) setOverride(stored as `0x${string}`);
    } catch {
      // ignore — localStorage unavailable
    }
  }, []);

  const address = override ?? addresses.payroll;
  const isCustom = override !== null && override !== addresses.payroll;

  return {
    address,
    isCustom,
    setActive: (addr) => {
      if (!isAddress(addr)) return;
      try {
        window.localStorage.setItem(STORAGE_KEY, addr);
      } catch {
        // ignore
      }
      setOverride(addr);
    },
    clearActive: () => {
      try {
        window.localStorage.removeItem(STORAGE_KEY);
      } catch {
        // ignore
      }
      setOverride(null);
    },
  };
}

"use client";

import { useEffect } from "react";

/**
 * Wallet browser extensions (Phantom, Brave Wallet, Coinbase) occasionally
 * throw from their injected `inpage.js` — typically when multiple are
 * competing for `window.ethereum`, or when their service worker is asleep.
 * Those errors bubble to `window.onerror` and trip Next.js dev overlay.
 * None of them originate from our code, so we filter them out here.
 */
export function ExtensionErrorFilter() {
  useEffect(() => {
    function fromExtension(src: string | undefined | null) {
      return !!src && src.startsWith("chrome-extension://");
    }
    function onError(ev: ErrorEvent) {
      if (fromExtension(ev.filename) || fromExtension(ev.error?.stack)) {
        ev.stopImmediatePropagation();
        ev.preventDefault();
      }
    }
    function onUnhandledRejection(ev: PromiseRejectionEvent) {
      const reason = ev.reason;
      const stack = reason?.stack ?? "";
      const msg = reason?.message ?? String(reason ?? "");
      if (
        stack.includes("chrome-extension://") ||
        msg.includes("chrome.runtime.sendMessage") ||
        msg.includes("must specify an Extension ID")
      ) {
        ev.preventDefault();
      }
    }
    window.addEventListener("error", onError, true);
    window.addEventListener("unhandledrejection", onUnhandledRejection, true);
    return () => {
      window.removeEventListener("error", onError, true);
      window.removeEventListener("unhandledrejection", onUnhandledRejection, true);
    };
  }, []);

  return null;
}

"use client";

import { ConnectButton as RKConnectButton } from "@rainbow-me/rainbowkit";

export function ConnectButton() {
  return (
    <RKConnectButton.Custom>
      {({ account, chain, openAccountModal, openChainModal, openConnectModal, mounted }) => {
        const ready = mounted;
        const connected = ready && account && chain;
        return (
          <div
            {...(!ready && {
              "aria-hidden": true,
              style: { opacity: 0, pointerEvents: "none", userSelect: "none" },
            })}
          >
            {(() => {
              if (!connected) {
                return (
                  <button
                    onClick={openConnectModal}
                    className="px-4 py-1.5 border border-border text-[11px] uppercase tracking-wider2 text-fg hover:border-fade"
                  >
                    CONNECT
                  </button>
                );
              }
              if (chain.unsupported) {
                return (
                  <button
                    onClick={openChainModal}
                    className="px-4 py-1.5 border border-accent text-[11px] uppercase tracking-wider2 text-accent"
                  >
                    WRONG_NETWORK
                  </button>
                );
              }
              return (
                <button
                  onClick={openAccountModal}
                  className="px-4 py-1.5 border border-border text-[11px] uppercase tracking-wider2 text-fg hover:border-fade"
                >
                  {account.displayName.toUpperCase()}
                </button>
              );
            })()}
          </div>
        );
      }}
    </RKConnectButton.Custom>
  );
}

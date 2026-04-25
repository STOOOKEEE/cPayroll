/**
 * Thin wrapper around the iExec Nox `@iexec-nox/handle` SDK.
 *
 * Trust model: plaintext amounts NEVER leave the browser. Decrypted values
 * are returned to React component state only.
 */

import type { WalletClient } from "viem";
import { createViemHandleClient } from "@iexec-nox/handle";
import type { HandleClient } from "@iexec-nox/handle";

const clientCache = new Map<string, Promise<HandleClient>>();

export async function getHandleClient(wallet: WalletClient): Promise<HandleClient> {
  if (!wallet.account?.address) {
    throw new Error("Wallet not connected — cannot create HandleClient without an address");
  }
  const key = wallet.account.address;
  let pending = clientCache.get(key);
  if (!pending) {
    pending = createViemHandleClient(wallet).catch((err) => {
      clientCache.delete(key);
      throw err;
    });
    clientCache.set(key, pending);
  }
  return pending;
}

export async function encryptAmount(
  wallet: WalletClient,
  amount: bigint,
  contract: `0x${string}`
): Promise<{ handle: `0x${string}`; handleProof: `0x${string}` }> {
  try {
    const client = await getHandleClient(wallet);
    const { handle, handleProof } = await client.encryptInput(amount, "uint256", contract);
    return {
      handle: handle as unknown as `0x${string}`,
      handleProof: handleProof as `0x${string}`,
    };
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    throw new Error(`Failed to encrypt amount: ${msg}`);
  }
}

export async function decryptBalance(
  wallet: WalletClient,
  handle: `0x${string}`
): Promise<bigint> {
  try {
    const client = await getHandleClient(wallet);
    // The SDK's Handle<T> type is a branded hex string at runtime.
    const { value } = await client.decrypt(handle as never);
    return BigInt(value as unknown as string | number | bigint);
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    throw new Error(`Failed to decrypt balance: ${msg}`);
  }
}

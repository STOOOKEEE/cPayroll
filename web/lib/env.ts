import { z } from "zod";

const optionalAddress = z
  .string()
  .optional()
  .default("")
  .refine((v) => v === "" || /^0x[0-9a-fA-F]{40}$/.test(v), "Invalid Ethereum address");

const schema = z.object({
  NEXT_PUBLIC_PAYROLL_ADDR: optionalAddress,
  NEXT_PUBLIC_FACTORY_ADDR: optionalAddress,
  NEXT_PUBLIC_CUSDC_ADDR: optionalAddress,
  NEXT_PUBLIC_USDC_ADDR: optionalAddress,
  NEXT_PUBLIC_ARB_SEPOLIA_RPC: z.string().url().optional().or(z.literal("")),
  NEXT_PUBLIC_NOX_ENV: z.enum(["sepolia", "mainnet"]).default("sepolia"),
  NEXT_PUBLIC_WALLETCONNECT_ID: z.string().optional().default(""),
});

export const env = schema.parse({
  NEXT_PUBLIC_PAYROLL_ADDR: process.env.NEXT_PUBLIC_PAYROLL_ADDR,
  NEXT_PUBLIC_FACTORY_ADDR: process.env.NEXT_PUBLIC_FACTORY_ADDR,
  NEXT_PUBLIC_CUSDC_ADDR: process.env.NEXT_PUBLIC_CUSDC_ADDR,
  NEXT_PUBLIC_USDC_ADDR: process.env.NEXT_PUBLIC_USDC_ADDR,
  NEXT_PUBLIC_ARB_SEPOLIA_RPC: process.env.NEXT_PUBLIC_ARB_SEPOLIA_RPC,
  NEXT_PUBLIC_NOX_ENV: process.env.NEXT_PUBLIC_NOX_ENV,
  NEXT_PUBLIC_WALLETCONNECT_ID: process.env.NEXT_PUBLIC_WALLETCONNECT_ID,
});

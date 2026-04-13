import { z } from "zod";

const schema = z.object({
  NEXT_PUBLIC_PAYROLL_ADDR: z.string().optional().default(""),
  NEXT_PUBLIC_CUSDC_ADDR: z.string().optional().default(""),
  NEXT_PUBLIC_USDC_ADDR: z.string().optional().default(""),
  NEXT_PUBLIC_NOX_ENV: z.enum(["sepolia", "mainnet"]).default("sepolia"),
  NEXT_PUBLIC_WALLETCONNECT_ID: z.string().optional().default(""),
});

export const env = schema.parse({
  NEXT_PUBLIC_PAYROLL_ADDR: process.env.NEXT_PUBLIC_PAYROLL_ADDR,
  NEXT_PUBLIC_CUSDC_ADDR: process.env.NEXT_PUBLIC_CUSDC_ADDR,
  NEXT_PUBLIC_USDC_ADDR: process.env.NEXT_PUBLIC_USDC_ADDR,
  NEXT_PUBLIC_NOX_ENV: process.env.NEXT_PUBLIC_NOX_ENV,
  NEXT_PUBLIC_WALLETCONNECT_ID: process.env.NEXT_PUBLIC_WALLETCONNECT_ID,
});

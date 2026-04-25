/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  experimental: { typedRoutes: true },
  headers: async () => [
    {
      source: "/(.*)",
      headers: [
        { key: "X-Frame-Options", value: "DENY" },
        { key: "X-Content-Type-Options", value: "nosniff" },
        { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
      ],
    },
  ],
  webpack: (config, { isServer }) => {
    // `@iexec-nox/handle` ships an ethers-backed service alongside the viem one;
    // ethers + pino-pretty + RN async-storage are optional peers we don't use.
    config.resolve = config.resolve || {};
    config.resolve.fallback = {
      ...(config.resolve.fallback || {}),
      ethers: false,
      "pino-pretty": false,
      "@react-native-async-storage/async-storage": false,
    };
    if (!isServer) {
      config.externals = config.externals || [];
    }
    return config;
  },
};
export default nextConfig;

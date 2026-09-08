import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactStrictMode: true,
  eslint: {
    ignoreDuringBuilds: true,
  },
  typescript: {
    // Keep typecheck on; auth/UI must compile cleanly for Vercel.
    ignoreBuildErrors: false,
  },
};

export default nextConfig;

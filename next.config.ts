import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  distDir: process.env.NEXT_DIST_DIR || ".next-local-build",
  output: "standalone",
  images: {
    remotePatterns: [
      { protocol: "https", hostname: "**" },
      { protocol: "http", hostname: "localhost" }
    ]
  },
  poweredByHeader: false,
  experimental: {
    proxyClientMaxBodySize: 52428800,
    serverActions: {
      bodySizeLimit: "2mb"
    }
  }
};

export default nextConfig;

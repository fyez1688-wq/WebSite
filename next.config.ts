import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  distDir: ".next-final",
  output: "standalone",
  images: {
    remotePatterns: [
      { protocol: "https", hostname: "**" },
      { protocol: "http", hostname: "localhost" }
    ]
  },
  poweredByHeader: false,
  experimental: {
    serverActions: {
      bodySizeLimit: "2mb"
    }
  }
};

export default nextConfig;

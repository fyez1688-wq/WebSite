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
  },
  webpack: (config) => {
    config.optimization.splitChunks.cacheGroups = {
      ...config.optimization.splitChunks.cacheGroups,
      musicPlayerContext: {
        test: /[\\/]music-player-context/,
        name: "music-player-context",
        chunks: "all",
        enforce: true,
        priority: 20
      }
    };
    return config;
  }
};

export default nextConfig;

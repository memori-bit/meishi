import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: 'standalone', // Cloud Run用にstandaloneモードを有効化
  // APIルートのタイムアウトを60秒に延長
  experimental: {
    serverActions: {
      bodySizeLimit: '2mb',
    },
  },
  webpack: (config, { isServer }) => {
    // Prismaクライアントはサーバーサイドでのみ使用
    if (!isServer) {
      config.resolve.fallback = {
        ...config.resolve.fallback,
        fs: false,
        net: false,
        tls: false,
      };
    }
    return config;
  },
};

export default nextConfig;

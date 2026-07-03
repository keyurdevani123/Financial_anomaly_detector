import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  async rewrites() {
    return [
      {
        source: "/api/v1/:path*",
        destination: "http://127.0.0.1:8002/api/v1/:path*",
      },
    ];
  },
  // Suppress hydration warning from browser extensions
  reactStrictMode: true,
};

export default nextConfig;

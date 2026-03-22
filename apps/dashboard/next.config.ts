import type { NextConfig } from "next";

const API_ORIGIN = process.env.API_ORIGIN || "http://localhost:3001";

const nextConfig: NextConfig = {
  reactCompiler: true,
  images: {
    remotePatterns: [
      { protocol: "https", hostname: "image.tmdb.org", pathname: "/t/p/**" },
      { protocol: "https", hostname: "*.backblazeb2.com" },
      { protocol: "https", hostname: "f002.backblazeb2.com" },
      { protocol: "https", hostname: "f005.backblazeb2.com" },
      { protocol: "http", hostname: "localhost", port: "3001" },
    ],
    unoptimized: process.env.NODE_ENV === "development",
  },
  async rewrites() {
    return [
      { source: "/api/auth/:path*", destination: `${API_ORIGIN}/api/auth/:path*` },
      { source: "/api/v1/:path*", destination: `${API_ORIGIN}/api/v1/:path*` },
    ];
  },
};

export default nextConfig;

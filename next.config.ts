import type { NextConfig } from "next";

const isVercel = process.env.VERCEL === "1";

const nextConfig: NextConfig = {
  distDir: isVercel ? ".next" : ".next-webpack",
};

export default nextConfig;

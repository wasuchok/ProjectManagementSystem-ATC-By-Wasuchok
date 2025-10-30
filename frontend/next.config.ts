import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  env: {
    NEXT_PUBLIC_IMAGE_API: process.env.NEXT_PUBLIC_IMAGE_API,
  },
};

export default nextConfig;

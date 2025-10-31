import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  env: {
    NEXT_PUBLIC_IMAGE_API: process.env.NEXT_PUBLIC_IMAGE_API,
  },
  allowedDevOrigins: [
    'http://10.17.3.244:5555',
    'http://localhost:5555',
  ],
};

export default nextConfig;

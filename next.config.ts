import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "export",
  reactStrictMode: true,
  images: {
    unoptimized: true,
  },
  // Allows seamless cross-device testing on local Wi-Fi without Next.js dev origin warnings
  allowedDevOrigins: [
    "172.20.10.2",
    "172.20.10.2:3001",
    "172.20.*",
    "192.168.1.4",
    "192.168.1.4:3001",
    "192.168.*",
    "localhost:3001",
    "127.0.0.1:3001",
  ],
};

export default nextConfig;

import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "export",
  basePath: "/OMBCube",
  images: {
    unoptimized: true,
  },
};

export default nextConfig;

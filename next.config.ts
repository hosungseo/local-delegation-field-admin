import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "export",
  basePath: "/local-delegation-field-admin",
  images: { unoptimized: true },
};

export default nextConfig;

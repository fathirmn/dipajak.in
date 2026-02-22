import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  serverExternalPackages: ["pdf-to-img", "pdfjs-dist"],
  turbopack: {},
};

export default nextConfig;

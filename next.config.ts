import type { NextConfig } from "next";
import { fixedSecurityHeaders, resourcePolicy } from "./src/server/security-headers";

const staticAssetHeaders = [
  ...Object.entries(fixedSecurityHeaders).map(([key, value]) => ({ key, value })),
  { key: "Content-Security-Policy", value: resourcePolicy },
];

const config: NextConfig = {
  output: "standalone",
  poweredByHeader: false,
  reactStrictMode: true,
  headers() {
    return Promise.resolve(
      [
        "/_next/static/:path*",
        "/_next/image/:path*",
        "/email/:path*",
        "/icon.svg",
        "/apple-icon.png",
        "/opengraph-image.png",
      ].map((source) => ({ source, headers: staticAssetHeaders })),
    );
  },
};

export default config;

import type { NextConfig } from "next";
import { fixedSecurityHeaders, resourcePolicy } from "./src/server/security-headers";

const staticAssetHeaders = [
  ...Object.entries(fixedSecurityHeaders).map(([key, value]) => ({ key, value })),
  { key: "Content-Security-Policy", value: resourcePolicy },
];

const mailAssetHeaders = staticAssetHeaders.map((header) =>
  header.key === "Cross-Origin-Resource-Policy" ? { ...header, value: "cross-origin" } : header,
);

const config: NextConfig = {
  output: "standalone",
  poweredByHeader: false,
  reactStrictMode: true,
  headers() {
    return Promise.resolve([
      ...[
        "/_next/static/:path*",
        "/_next/image/:path*",
        "/icon.svg",
        "/apple-icon.png",
        "/opengraph-image.png",
      ].map((source) => ({ source, headers: staticAssetHeaders })),
      { source: "/email/:path*", headers: mailAssetHeaders },
    ]);
  },
};

export default config;

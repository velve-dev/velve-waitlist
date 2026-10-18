import type { Metadata, Viewport } from "next";
import { headers } from "next/headers";
import type { ReactNode } from "react";
import { PageViews } from "@/components/page-views";
import { meta } from "@/content/copy";
import { siteIsIndexable } from "@/server/indexing";
import { umamiSettings } from "@/server/umami";
import { geist, geistMono } from "./fonts";
import "./globals.css";

export function generateMetadata(): Metadata {
  return {
    metadataBase: new URL(process.env.SITE_URL ?? "https://velve.dev"),
    robots: siteIsIndexable() ? { index: true, follow: true } : { index: false, follow: false },
    title: meta.title,
    description: meta.description,
    openGraph: { title: meta.title, description: meta.description, type: "website" },
  };
}

export const viewport: Viewport = {
  themeColor: "#050509",
  colorScheme: "dark",
};

export default async function RootLayout({ children }: { children: ReactNode }) {
  const nonce = (await headers()).get("x-nonce") ?? undefined;
  const umami = umamiSettings();
  return (
    <html lang="en" className={`${geist.variable} ${geistMono.variable}`}>
      <body className="bg-base font-sans text-primary">
        {children}
        {umami !== null && (
          <>
            <script
              defer
              nonce={nonce}
              src="/stats/script.js"
              data-website-id={umami.websiteId}
              data-host-url="/stats"
              data-auto-track="false"
              data-do-not-track="true"
            />
            <PageViews />
          </>
        )}
      </body>
    </html>
  );
}

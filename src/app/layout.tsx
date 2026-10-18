import type { Metadata, Viewport } from "next";
import { connection } from "next/server";
import type { ReactNode } from "react";
import { PageViews } from "@/components/page-views";
import { meta } from "@/content/copy";
import { umamiSettings } from "@/server/umami";
import { geist, geistMono } from "./fonts";
import "./globals.css";

export function generateMetadata(): Metadata {
  return {
    metadataBase: new URL(process.env.SITE_URL ?? "https://velve.dev"),
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
  await connection();
  const umami = umamiSettings();
  return (
    <html lang="en" className={`${geist.variable} ${geistMono.variable}`}>
      <body className="bg-base font-sans text-primary">
        {children}
        {umami !== null && (
          <>
            <script
              defer
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

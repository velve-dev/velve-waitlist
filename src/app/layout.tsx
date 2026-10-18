import type { Metadata, Viewport } from "next";
import type { ReactNode } from "react";
import { meta } from "@/content/copy";
import { geist, geistMono } from "./fonts";
import "./globals.css";

export const metadata: Metadata = {
  title: meta.title,
  description: meta.description,
};

export const viewport: Viewport = {
  themeColor: "#050509",
  colorScheme: "dark",
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en" className={`${geist.variable} ${geistMono.variable}`}>
      <body className="bg-base font-sans text-primary">{children}</body>
    </html>
  );
}

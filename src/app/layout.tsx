import type { Metadata } from "next";
import type { ReactNode } from "react";
import { meta } from "@/content/copy";
import "./globals.css";

export const metadata: Metadata = {
  title: meta.title,
  description: meta.description,
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}

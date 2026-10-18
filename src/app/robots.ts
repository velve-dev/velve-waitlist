import type { MetadataRoute } from "next";
import { connection } from "next/server";
import { siteIsIndexable } from "@/server/indexing";

export default async function robots(): Promise<MetadataRoute.Robots> {
  await connection();
  return siteIsIndexable()
    ? { rules: { userAgent: "*", allow: "/", disallow: ["/confirm/", "/unsubscribe/", "/api/"] } }
    : { rules: { userAgent: "*", disallow: "/" } };
}

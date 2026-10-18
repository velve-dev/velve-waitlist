// Decides whether search engines may index the site.
import { pendingLegalReview } from "@/content/legal";

export function siteIsIndexable(env: Record<string, string | undefined> = process.env): boolean {
  return env.SITE_INDEXABLE?.trim() === "true" && pendingLegalReview.length === 0;
}

// Decides whether search engines may index the site.
import { pendingLegalReview } from "@/content/legal";

export function siteIsIndexable(
  env: Record<string, string | undefined> = process.env,
  openLegalPoints: readonly string[] = pendingLegalReview,
): boolean {
  return env.SITE_INDEXABLE?.trim() === "true" && openLegalPoints.length === 0;
}

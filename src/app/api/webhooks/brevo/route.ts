import { withServices } from "@/server/route-guard";
import { handleBrevoWebhook } from "@/server/unsubscribe";

export const dynamic = "force-dynamic";

export function POST(request: Request) {
  return withServices((services) => handleBrevoWebhook(request, services));
}

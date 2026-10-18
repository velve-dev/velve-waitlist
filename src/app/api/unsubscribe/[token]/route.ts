import { withServices } from "@/server/route-guard";
import { handleUnsubscribe } from "@/server/unsubscribe";

export const dynamic = "force-dynamic";

export async function POST(_request: Request, { params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  return withServices((services) => handleUnsubscribe(token, services));
}

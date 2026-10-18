import { relayEvent } from "@/server/umami";

export const dynamic = "force-dynamic";

export function POST(request: Request) {
  return relayEvent(request);
}

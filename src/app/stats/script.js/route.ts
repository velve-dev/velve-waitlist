import { serveTrackerScript } from "@/server/umami";

export const dynamic = "force-dynamic";

export function GET() {
  return serveTrackerScript();
}

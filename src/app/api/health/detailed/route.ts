import { detailedHealth } from "@/server/health";

export const dynamic = "force-dynamic";

export function GET(request: Request) {
  return detailedHealth(request);
}

import { simpleHealth } from "@/server/health";

export const dynamic = "force-dynamic";

export function GET() {
  return simpleHealth();
}

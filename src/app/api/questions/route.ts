import { handleAnswers } from "@/server/answers";
import { withServices } from "@/server/route-guard";

export const dynamic = "force-dynamic";

export function POST(request: Request) {
  return withServices((services) => handleAnswers(request, services));
}

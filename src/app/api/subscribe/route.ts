import { handleSignup } from "@/server/signup";
import { withServices } from "@/server/route-guard";

export const dynamic = "force-dynamic";

export function POST(request: Request) {
  return withServices((services) => handleSignup(request, services));
}

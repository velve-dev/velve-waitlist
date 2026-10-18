import { NextResponse, type NextRequest } from "next/server";
import { formErrors } from "@/content/copy";
import { ConfigError, getConfig } from "@/server/config";
import { checkLinkLimit, limitedGroupFor } from "@/server/link-limits";

export function proxy(request: NextRequest) {
  const group = limitedGroupFor(request.nextUrl.pathname);
  if (group === null) return NextResponse.next();

  let settings;
  try {
    settings = getConfig();
  } catch (error) {
    if (error instanceof ConfigError) return NextResponse.next();
    throw error;
  }

  const decision = checkLinkLimit(group, request.headers, settings, Date.now());
  if (decision.allowed) return NextResponse.next();
  return new NextResponse(formErrors.rateLimited, {
    status: 429,
    headers: {
      "content-type": "text/plain; charset=utf-8",
      "retry-after": String(decision.retryAfterSeconds),
      "cache-control": "no-store",
    },
  });
}

export const config = {
  matcher: [
    "/confirm/:path*",
    "/unsubscribe/:path*",
    "/api/unsubscribe/:path*",
    "/api/webhooks/:path*",
  ],
};

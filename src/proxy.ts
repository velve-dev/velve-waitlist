import { NextResponse, type NextRequest } from "next/server";
import { formErrors } from "@/content/copy";
import { ConfigError, getConfig } from "@/server/config";
import { siteIsIndexable } from "@/server/indexing";
import { checkLinkLimit, limitedGroupFor } from "@/server/link-limits";
import { fixedSecurityHeaders, pagePolicy, resourcePolicy } from "@/server/security-headers";

function isResourceRoute(pathname: string): boolean {
  return pathname.startsWith("/api/") || pathname.startsWith("/stats/");
}

function secure(response: NextResponse, policy: string): NextResponse {
  response.headers.set("Content-Security-Policy", policy);
  for (const [name, value] of Object.entries(fixedSecurityHeaders))
    response.headers.set(name, value);
  if (!siteIsIndexable()) response.headers.set("X-Robots-Tag", "noindex, nofollow");
  return response;
}

function rateLimited(request: NextRequest): NextResponse | null {
  const group = limitedGroupFor(request.nextUrl.pathname);
  if (group === null) return null;
  let settings;
  try {
    settings = getConfig();
  } catch (error) {
    if (error instanceof ConfigError) return null;
    throw error;
  }
  const decision = checkLinkLimit(group, request.headers, settings, Date.now());
  if (decision.allowed) return null;
  return new NextResponse(formErrors.rateLimited, {
    status: 429,
    headers: {
      "content-type": "text/plain; charset=utf-8",
      "retry-after": String(decision.retryAfterSeconds),
      "cache-control": "no-store",
    },
  });
}

export function proxy(request: NextRequest) {
  const limited = rateLimited(request);
  if (limited !== null) return secure(limited, resourcePolicy);

  if (isResourceRoute(request.nextUrl.pathname)) {
    return secure(NextResponse.next(), resourcePolicy);
  }

  const nonce = Buffer.from(crypto.getRandomValues(new Uint8Array(16))).toString("base64");
  const policy = pagePolicy(nonce, {
    development: process.env.NODE_ENV === "development",
    https: (process.env.SITE_URL ?? "").startsWith("https://"),
  });
  const requestHeaders = new Headers(request.headers);
  requestHeaders.set("x-nonce", nonce);
  requestHeaders.set("Content-Security-Policy", policy);
  return secure(NextResponse.next({ request: { headers: requestHeaders } }), policy);
}

export const config = {
  matcher: [
    {
      source:
        "/((?!_next/static|_next/image|email/|icon.svg|apple-icon.png|opengraph-image.png).*)",
    },
  ],
};

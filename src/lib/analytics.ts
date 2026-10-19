// Sends cookieless Umami events with token paths stripped.
export const analyticsEvents = [
  "signup_submitted",
  "signup_confirmed",
  "questions_answered",
] as const;
type AnalyticsEvent = (typeof analyticsEvents)[number];
type UmamiPayload = Record<string, unknown>;
type Umami = { track: (build: (payload: UmamiPayload) => UmamiPayload) => unknown };

const tokenRoutes = ["/confirm/", "/unsubscribe/", "/questions/"];

const tokenLikeSegment = /^[A-Za-z0-9_-]{24,}$/;
const addressLikeSegment = /@|%40/i;

function redactSegment(segment: string): string {
  return tokenLikeSegment.test(segment) || addressLikeSegment.test(segment) ? "redacted" : segment;
}

export function publicPath(pathname: string): string {
  const tokenRoute = tokenRoutes.find((prefix) => pathname.startsWith(prefix));
  if (tokenRoute !== undefined) return tokenRoute.slice(0, -1);
  return pathname.split("/").map(redactSegment).join("/");
}

function tracker(): Umami | undefined {
  return (window as Window & { umami?: Umami }).umami;
}

function send(extra: UmamiPayload) {
  tracker()?.track((payload) => ({
    ...payload,
    url: publicPath(window.location.pathname),
    referrer: "",
    ...extra,
  }));
}

export function trackPageView() {
  send({});
}

export function trackEvent(name: AnalyticsEvent) {
  send({ name });
}

export function whenTrackerReady(run: () => void): () => void {
  let attempts = 0;
  const timer = window.setInterval(() => {
    attempts += 1;
    if (tracker() !== undefined) {
      window.clearInterval(timer);
      run();
    } else if (attempts > 50) {
      window.clearInterval(timer);
    }
  }, 100);
  return () => window.clearInterval(timer);
}

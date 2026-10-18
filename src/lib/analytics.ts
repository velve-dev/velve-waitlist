// Sends cookieless Umami events with token paths stripped.
type AnalyticsEvent = "signup_submitted" | "signup_confirmed";
type UmamiPayload = Record<string, unknown>;
type Umami = { track: (build: (payload: UmamiPayload) => UmamiPayload) => unknown };

const tokenRoutes = ["/confirm/", "/unsubscribe/"];

function publicPath(pathname: string): string {
  const tokenRoute = tokenRoutes.find((prefix) => pathname.startsWith(prefix));
  return tokenRoute === undefined ? pathname : tokenRoute.slice(0, -1);
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

export function trackEvent(name: AnalyticsEvent) {
  send({ name });
}

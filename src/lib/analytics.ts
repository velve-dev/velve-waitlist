// Sends cookieless Umami events with token paths stripped.
type AnalyticsEvent = "signup_submitted" | "signup_confirmed";
type UmamiPayload = Record<string, unknown>;
type Umami = { track: (build: (payload: UmamiPayload) => UmamiPayload) => unknown };

const tokenRoutes = ["/confirm/", "/unsubscribe/"];

export function publicPath(pathname: string): string {
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

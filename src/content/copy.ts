// Every user-facing string on the site, approved word for word.

export const meta = {
  title: "Velve · Security without shortcuts",
  description: "Deploys as simple as a git push. Join the Velve waitlist.",
} as const;

export const hero = {
  heading: "Security without shortcuts.",
  subline: "Deploys as simple as a git push.",
} as const;

export const contactEmail = "hello@velve.dev";

export const links = {
  threads: "https://www.threads.com/@velvedev",
  github: "https://github.com/velve-dev",
  levoStudio: "https://levo-studio.com",
} as const;

export const footer = {
  homeLabel: "Velve home",
  brand: "Velve",
  tagline: "Ships when it's ready, not when the slide deck says so.",
  followHeading: "Follow",
  followLabel: "Follow the build",
  threads: "Threads",
  github: "GitHub",
  legalHeading: "Legal",
  imprint: "Imprint",
  privacy: "Privacy",
  cookies: "No cookies were harmed in the making of this page. There were none.",
  copyright: "© 2026 Levo Studio",
  wordmark: "velve",
} as const;

export const pill = {
  prompt: "$",
  command: "git push origin main",
  live: "live",
} as const;

export const form = {
  label: "Join the waitlist",
  nameLabel: "First name, optional",
  emailLabel: "Email",
  namePlaceholderMobile: "First name (optional)",
  namePlaceholderDesktop: "First name",
  emailPlaceholder: "you@company.com",
  submit: "Join the waitlist",
  finePrint: "First name is optional. An update every few weeks, unsubscribe any time.",
  privacy: "Privacy",
} as const;

export const formErrors = {
  missing: "Email is missing. Enter an address to join.",
  noAt: "This address has no @. Add it before the domain.",
  noDomainEnding: "This address has no domain ending. Add one, like .com or .de.",
  rateLimited: "Easy there. Too many tries from this network, give it a few minutes.",
  failed: "That didn't go through. Try again in a moment.",
} as const;

export const submitted = {
  title: "Check your inbox",
  body: "Click the link we've sent to {email}. Typo?",
  typo: "Typo?",
  hint: "Nothing there? Check your spam folder. Each address gets one link a day.",
} as const;

export const confirmed = {
  titleWithName: "You're in, {name}",
  title: "You're in",
  body: "First update in a few weeks. Until then the build happens in public.",
  threads: "Threads ↗",
  github: "GitHub ↗",
} as const;

export const alreadyIn = {
  title: "You're already in",
  body: "Clicking twice won't get you in faster, but we like the enthusiasm.",
} as const;

export const unsubscribe = {
  title: "Leaving before the good part?",
  body: "Velve hasn't even launched yet. Leave now and you'll miss the email where it does.",
  confirm: "Unsubscribe",
  stay: "Fine, I'll stay",
} as const;

export const unsubscribed = {
  title: "You're off the list",
  body: "No hard feelings. Your address is deleted, and the door stays open if you change your mind.",
  back: "Back to velve.dev",
} as const;

export const brokenUnsubscribeLink = {
  title: "This link doesn't work",
  body: "It may be old or cut off by your email app. Write to hello@velve.dev and we take you off by hand.",
} as const;

export const brokenConfirmLink = {
  title: "This link doesn't work",
  body: "It may be old or cut off by your email app. Sign up again and we'll send a fresh one.",
} as const;

export const notFound = {
  eyebrow: "404 · not found",
  title: "Nothing lives here",
  body: "Like a region you never picked, this page holds nothing. Maybe it moved, maybe it never existed.",
  back: "Back to velve.dev",
} as const;

export const serverError = {
  title: "Something broke on our side",
  body: "Not your fault. Try again in a minute.",
  back: "Back to velve.dev",
} as const;

export const questions = {
  eyebrow: "2 questions · 20 seconds",
  title: "Help us pick what comes first",
  body: "Optional, two taps. Your answers help decide what Velve supports first.",
  firstDeploy: {
    legend: "What would you deploy on Velve first?",
    options: {
      web_app: "Web app",
      api: "API or backend",
      database: "Database",
      static_site: "Static site",
      side_project: "Side project",
      other: "Something else",
    },
  },
  runsOn: {
    legend: "Where does it run today?",
    options: {
      vercel_netlify: "Vercel or Netlify",
      hyperscaler: "AWS, Google Cloud or Azure",
      own_server: "Own server or VPS",
      paas: "Render, Railway or Fly",
      nowhere: "Nowhere yet",
      other: "Somewhere else",
    },
  },
  submit: "Send my vote",
  doneTitle: "Vote counted",
  doneBody: "Thanks. Your answers help decide what Velve supports first.",
  back: "Back to velve.dev",
} as const;

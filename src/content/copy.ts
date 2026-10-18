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
} as const;

// Every word that appears in a Velve email.
export const mailFrame = {
  greeting: "Hey {greeting},",
  team: "The Velve Team",
  threads: "Threads ↗",
  github: "GitHub ↗",
  site: "velve.dev ↗",
  address: "Velve, a product of Levo Studio · Europaplatz 2/1, 72072 Tübingen",
  unsubscribe: "Unsubscribe",
  privacy: "Privacy",
} as const;

export const confirmMail = {
  subject: "Confirm your spot on the Velve waitlist",
  preview: "One click and you're in.",
  title: "One click and you're in",
  body: "one click and you're on the list. After that you'll hear from us every few weeks, whenever there's something worth reading.",
  button: "Confirm my email",
  note: "Not you? Ignore this and nothing happens.",
  signoff: "See you soon,",
} as const;
export const welcomeMail = {
  subject: "You're on the Velve waitlist",
  title: "You're in",
  body: "thanks for confirming. Every few weeks you'll get what we shipped, what broke and what's next. Countdowns and last chances aren't our thing.",
  vote: "one more thing: we're deciding what Velve supports first, and you get a vote. Two taps, no essay, no personality test.",
  voteButton: "Cast my vote",
  signoff: "Stay tuned and see you soon,",
} as const;

export const updateMail = {
  subject: "Velve update {n} · {title}",
  eyebrow: "update {n} · {month year}",
  title: "{title}",
  intro: "here's where Velve stands.",
  sections: ["shipped", "broke", "next"],
  shippedPlaceholder: "[What we shipped since the last update.]",
  brokePlaceholder: "[What didn't work since the last update, in two sentences.]",
  nextPlaceholder: "[What we're building before the next update.]",
  closing: "Questions? Hit reply, a human reads it.",
  signoff: "Stay tuned,",
} as const;

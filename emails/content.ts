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

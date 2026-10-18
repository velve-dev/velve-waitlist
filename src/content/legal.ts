// Imprint and privacy texts, approved word for word.
export const pendingLegalReview: readonly string[] = [
  "[TODO] Name the data centre operators behind Levo Studio's servers, with their countries.",
  "[TODO] Confirm that server logs are deleted after 7 days.",
  "[TODO] Check Brevo's address against the current data processing agreement.",
  "[TODO] Release the sentence on anonymous open and click counting after the mail test.",
];

export const imprint = {
  title: "Imprint",
  subline: "Required by German law, kept as short as it allows.",
  sections: [
    {
      heading: "Provider · § 5 DDG",
      lines: [
        "Velve is a product of Levo Studio",
        "Julius Grimm",
        "Europaplatz 2/1, 72072 Tübingen, Germany",
      ],
      tone: "primary",
    },
    {
      heading: "Contact",
      lines: ["hello@velve.dev", "+49 176 61028522"],
      tone: "primary",
    },
    {
      heading: "Responsible for content",
      lines: ["Julius Grimm, address as above"],
      tone: "primary",
    },
    {
      heading: "Liability",
      lines: [
        "We are responsible for our own content under general law. We have no influence over external sites we link to and are not responsible for their content. As soon as we learn of a legal violation, we remove the content or link in question.",
      ],
      tone: "muted",
    },
    {
      heading: "Copyright",
      lines: [
        "Content on this site is subject to German copyright law. Velve's source code is published under the licence stated in each repository.",
      ],
      tone: "muted",
    },
  ],
} as const;

export const privacy = {
  title: "Privacy",
  subline:
    "Short version: we store your email and, if you give it, your first name. We use them to send you updates. That's it.",
  updated: "last updated 18 oct 2026",
  sections: [
    {
      heading: "Who is responsible",
      text: "Velve is a product of Levo Studio, Julius Grimm, Europaplatz 2/1, 72072 Tübingen, Germany. For anything about your data, write to hello@velve.dev.",
    },
    {
      heading: "What we store and why",
      text: "Your email address, and your first name if you enter it, so we can confirm your sign-up, greet you properly and send you updates. Legal basis is your consent, Art. 6(1)(a) GDPR. We also keep when you signed up and confirmed, together with the consent text you agreed to, so we can prove you asked for the emails. Legal basis is our legitimate interest, Art. 6(1)(f) GDPR.",
    },
    {
      heading: "Where it lives and who helps",
      text: "This website runs on infrastructure operated by Levo Studio on servers in Germany and the Netherlands, described at levo-studio.com. The list itself is kept at Brevo, operated by Sendinblue SAS, 106 boulevard Haussmann, 75008 Paris, France, which stores your address in the EU and sends our emails on our behalf under a data processing agreement. Brevo counts email opens and clicks only anonymously, as totals that are never linked to you. Page views are counted with Umami on Levo Studio's servers, without cookies, IP addresses or profiles.",
    },
    {
      heading: "How long we keep it",
      text: "Until you unsubscribe or ask us to delete it, then it is deleted, not just hidden. If you never click the confirmation link, your address never makes it onto the list. Server logs are deleted after 7 days. This site sets no cookies and loads nothing from anyone else.",
    },
    {
      heading: "Your rights",
      text: "You can ask what we store and have it corrected, deleted, restricted or handed to you (Art. 15 to 18 and 20 GDPR), object to processing (Art. 21) and withdraw consent any time with the unsubscribe link in every email (Art. 7(3)). Write to hello@velve.dev. You can also complain to a data protection authority, for example the State Commissioner for Data Protection Baden-Württemberg.",
    },
  ],
} as const;

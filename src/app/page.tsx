import { connection } from "next/server";
import { Hero } from "@/components/hero";
import { PageShell } from "@/components/page-shell";
import { WaitlistForm } from "@/components/waitlist-form";
import { issueFormToken } from "@/server/form-token";

export default async function WaitlistPage() {
  await connection();
  return (
    <PageShell>
      <Hero>
        <WaitlistForm formToken={issueFormToken()} />
      </Hero>
    </PageShell>
  );
}

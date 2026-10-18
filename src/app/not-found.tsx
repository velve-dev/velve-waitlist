import { SearchX } from "lucide-react";
import { MessagePage } from "@/components/message-page";
import { SecondaryLink } from "@/components/secondary-link";
import { notFound } from "@/content/copy";

export default function NotFound() {
  return (
    <MessagePage
      icon={<SearchX size={22} strokeWidth={2} />}
      tone="primary"
      eyebrow={notFound.eyebrow}
      title={notFound.title}
      body={notFound.body}
    >
      <div className="mt-6">
        <SecondaryLink href="/">{notFound.back}</SecondaryLink>
      </div>
    </MessagePage>
  );
}

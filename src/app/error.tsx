"use client";

import { SearchX } from "lucide-react";
import { MessagePage } from "@/components/message-page";
import { SecondaryLink } from "@/components/secondary-link";
import { serverError } from "@/content/copy";

export default function ServerError() {
  return (
    <MessagePage
      icon={<SearchX size={22} strokeWidth={2} />}
      tone="primary"
      title={serverError.title}
      body={serverError.body}
    >
      <div className="mt-6">
        <SecondaryLink href="/">{serverError.back}</SecondaryLink>
      </div>
    </MessagePage>
  );
}

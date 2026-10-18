import type { Metadata } from "next";
import { cookies } from "next/headers";
import { Suspense } from "react";

import {
  AssistantView,
  AssistantViewFallback,
} from "@/features/assistant/assistant-view";
import { LOCALE_COOKIE_NAME, parseLocale } from "@/lib/preferences";

export async function generateMetadata(): Promise<Metadata> {
  const locale = parseLocale((await cookies()).get(LOCALE_COOKIE_NAME)?.value);
  return { title: locale === "de" ? "KI-Assistent" : "AI Assistant" };
}

export default function AssistantPage() {
  return (
    <Suspense fallback={<AssistantViewFallback />}>
      <AssistantView />
    </Suspense>
  );
}

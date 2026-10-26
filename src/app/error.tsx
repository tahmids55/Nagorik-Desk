"use client";

import { TriangleAlert } from "lucide-react";
import { useEffect } from "react";
import { useI18n } from "@/i18n/client";

export default function ErrorPage({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  const { t } = useI18n();
  useEffect(() => {
    // The digest links this screen to the server log line; no personal data is sent.
    console.error("render error", error.digest);
  }, [error]);
  return (
    <div className="mx-auto flex max-w-md flex-col items-start px-4 py-24 text-left">
      <TriangleAlert className="mb-4 h-8 w-8 text-danger" strokeWidth={1.5} aria-hidden="true" />
      <h1 className="text-xl font-semibold">{t("error_title")}</h1>
      <p className="mt-2 text-sm text-muted">{t("error_body")}</p>
      {error.digest && <p className="mt-2 font-mono text-xs text-muted">ref: {error.digest}</p>}
      <button type="button" onClick={reset} className="btn-primary mt-6 rounded-[3px] font-medium">
        {t("try_again")}
      </button>
    </div>
  );
}

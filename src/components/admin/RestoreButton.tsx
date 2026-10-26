"use client";

import { useRouter } from "next/navigation";
import { useTransition } from "react";
import { useI18n } from "@/i18n/client";
import { restoreIssue } from "@/server/actions/admin";

export function RestoreButton({ issueId }: { issueId: string }) {
  const { t } = useI18n();
  const router = useRouter();
  const [pending, start] = useTransition();
  return (
    <button
      type="button"
      className="btn-secondary btn-sm rounded-[3px] font-medium"
      disabled={pending}
      onClick={() =>
        start(async () => {
          await restoreIssue(issueId);
          router.refresh();
        })
      }
    >
      {t("restore")}
    </button>
  );
}

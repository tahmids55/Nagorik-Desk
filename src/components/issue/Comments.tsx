"use client";

import { Briefcase, Shield, Trash2, Wrench } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState, useTransition } from "react";
import { useFormState } from "react-dom";
import { Avatar } from "@/components/ui/Avatar";
import { FormAlert, SubmitButton } from "@/components/ui/forms";
import { TimeAgo } from "@/components/ui/TimeAgo";
import { useI18n } from "@/i18n/client";
import { LIMITS } from "@/lib/constants";
import type { CommentDTO } from "@/lib/types";
import { addComment, deleteOwnComment } from "@/server/actions/issues";
import { FlagButton } from "./FlagButton";

function RoleBadge({ role }: { role: string }) {
  const { t } = useI18n();
  const map = { office: [Briefcase, "role_office"], authority: [Wrench, "role_authority"], admin: [Shield, "role_admin"] } as const;
  const m = map[role as keyof typeof map];
  if (!m) return null;
  const Icon = m[0];
  return (
    <span className="inline-flex items-center gap-1 rounded-[2px] border border-brand/40 px-1.5 py-0.5 text-[10px] font-medium text-brand">
      <Icon className="h-3 w-3" aria-hidden="true" />
      {t(m[1])}
    </span>
  );
}

export function Comments({ issueId, comments, signedIn }: { issueId: string; comments: CommentDTO[]; signedIn: boolean }) {
  const { t, tn } = useI18n();
  const router = useRouter();
  const [state, action] = useFormState(addComment, null);
  const [text, setText] = useState("");
  const formRef = useRef<HTMLFormElement>(null);
  const [, start] = useTransition();

  useEffect(() => {
    if (state?.ok) {
      setText("");
      formRef.current?.reset();
    }
  }, [state]);

  return (
    <section className="rounded-[4px] border border-line bg-surface p-5" id="comments" aria-labelledby="comments-title">
      <h2 id="comments-title" className="text-base font-semibold">
        {tn("comments", comments.length)}
      </h2>

      {signedIn ? (
        <form ref={formRef} action={action} className="mt-4 space-y-2">
          <input type="hidden" name="issueId" value={issueId} />
          <textarea
            name="body"
            required
            rows={2}
            maxLength={LIMITS.commentMax}
            value={text}
            onChange={(e) => setText(e.target.value)}
            className="input rounded-[3px] resize-y"
            placeholder={t("comment_placeholder")}
            aria-label={t("comment_placeholder")}
          />
          <div className="flex items-center justify-between gap-3">
            <span className="hint !mt-0">
              {text.length}/{LIMITS.commentMax}
            </span>
            <SubmitButton className="btn-sm rounded-[3px]" disabled={text.trim().length === 0}>
              {t("post_comment")}
            </SubmitButton>
          </div>
          <FormAlert state={state} />
        </form>
      ) : (
        <p className="mt-4 rounded-[3px] border border-line px-4 py-3 text-sm text-muted">
          <Link href={`/login?next=${encodeURIComponent(`/issues/${issueId}`)}`} className="link font-semibold">
            {t("sign_in")}
          </Link>{" "}
          {t("to_comment")}
        </p>
      )}

      {comments.length === 0 ? (
        <p className="mt-5 text-sm text-muted">{t("no_comments")}</p>
      ) : (
        <ul className="mt-5 space-y-4">
          {comments.map((c) => (
            <li key={c.id} className="flex gap-3 border-b border-line pb-3 last:border-b-0 last:pb-0">
              <Link href={`/u/${c.author.id}`} aria-label={c.author.name}>
                <Avatar name={c.author.name} mediaId={c.author.avatarMediaId} size="sm" />
              </Link>
              <div className="min-w-0 flex-1">
                <div>
                  <p className="flex flex-wrap items-center gap-x-2 gap-y-0.5 text-[13px] font-semibold">
                    <Link href={`/u/${c.author.id}`} className="hover:underline">
                      {c.author.name || t("deleted_user")}
                    </Link>
                    <RoleBadge role={c.author.role} />
                  </p>
                  <p className="mt-1 whitespace-pre-line break-words text-[14.5px]" data-ugc>
                    {c.body}
                  </p>
                </div>
                <div className="mt-1.5 flex items-center gap-3 text-xs text-faint">
                  <TimeAgo date={c.createdAt} />
                  {c.mine ? (
                    <button
                      type="button"
                      className="inline-flex items-center gap-1 hover:text-danger"
                      onClick={() =>
                        confirm(t("confirm_delete_comment")) &&
                        start(async () => {
                          await deleteOwnComment(c.id);
                          router.refresh();
                        })
                      }
                    >
                      <Trash2 className="h-3.5 w-3.5" aria-hidden="true" />
                      {t("delete")}
                    </button>
                  ) : (
                    <FlagButton compact targetType="comment" targetId={c.id} signedIn={signedIn} />
                  )}
                </div>
              </div>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

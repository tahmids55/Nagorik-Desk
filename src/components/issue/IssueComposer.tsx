"use client";

import { AlertTriangle, EyeOff, Flame } from "lucide-react";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useFormState } from "react-dom";
import { LocationPicker, type Pin } from "@/components/map/LocationPicker";
import { CategoryIcon } from "@/components/ui/CategoryIcon";
import { FieldError, FormAlert, SubmitButton } from "@/components/ui/forms";
import { ImageUploader } from "@/components/ui/ImageUploader";
import { useI18n } from "@/i18n/client";
import { cn } from "@/lib/cn";
import { LIMITS } from "@/lib/constants";
import { detectUpazila, nearestArea } from "@/lib/geo/areas";
import { checkSimilar, createIssue } from "@/server/actions/issues";
import type { SimilarDTO } from "@/server/queries/issues";

type Cat = { id: string; name: string; icon: string };
type Area = { id: string; parentId: string | null; kind: "upazila" | "union"; name: string; lat: number; lng: number };

export function IssueComposer({ apiKey, mapId, categories, areas, defaultUpazila, defaultUnion }: { apiKey?: string; mapId?: string; categories: Cat[]; areas: Area[]; defaultUpazila: string; defaultUnion: string }) {
  const { t } = useI18n();
  const [state, action] = useFormState(createIssue, null);
  const [category, setCategory] = useState("");
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [upazila, setUpazila] = useState(defaultUpazila);
  const [union, setUnion] = useState(defaultUnion);
  const [pin, setPin] = useState<Pin | null>(null);
  const [mediaIds, setMediaIds] = useState<string[]>([]);
  const [similar, setSimilar] = useState<SimilarDTO[]>([]);

  const upazilas = useMemo(() => areas.filter((a) => a.kind === "upazila"), [areas]);
  const unions = useMemo(() => areas.filter((a) => a.kind === "union" && a.parentId === upazila), [areas, upazila]);

  // A pin decides the area (same rule the server applies).
  useEffect(() => {
    if (!pin) return;
    const up = detectUpazila(pin.lat, pin.lng);
    if (up) setUpazila(up);
    const near = nearestArea(pin, areas.filter((a) => a.kind === "union" && a.parentId === (up ?? upazila)));
    setUnion(near?.id ?? "");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pin]);

  // Duplicate check: nearby reports in the same category (debounced)
  useEffect(() => {
    if (!pin || !category || title.trim().length < LIMITS.titleMin) return setSimilar([]);
    const h = setTimeout(() => {
      checkSimilar({ lat: pin.lat, lng: pin.lng, categoryId: category, title }).then(setSimilar).catch(() => setSimilar([]));
    }, 600);
    return () => clearTimeout(h);
  }, [pin, category, title]);

  return (
    <form action={action} className="space-y-6" noValidate>
      <input type="hidden" name="mediaIds" value={mediaIds.join(",")} />
      <input type="hidden" name="hasPin" value={pin ? "1" : "0"} />
      <input type="hidden" name="lat" value={pin?.lat ?? ""} />
      <input type="hidden" name="lng" value={pin?.lng ?? ""} />

      <fieldset>
        <legend className="label">{t("composer_category")}</legend>
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
          {categories.map((c) => (
            <label key={c.id} className={cn("flex cursor-pointer items-center gap-2 rounded-[3px] border px-3 py-2.5 text-[13px] font-semibold transition-colors", category === c.id ? "border-brand bg-brand-soft text-brand" : "border-line bg-surface text-muted hover:border-brand/50")}>
              <input type="radio" name="categoryId" value={c.id} checked={category === c.id} onChange={() => setCategory(c.id)} className="sr-only" />
              <CategoryIcon name={c.icon} className="h-4 w-4 shrink-0" />
              <span className="leading-tight">{c.name}</span>
            </label>
          ))}
        </div>
        <FieldError state={state} name="categoryId" />
      </fieldset>

      <div>
        <label htmlFor="title" className="label">
          {t("composer_title")}
        </label>
        <input id="title" name="title" required maxLength={LIMITS.titleMax} className="input rounded-[3px]" value={title} onChange={(e) => setTitle(e.target.value)} placeholder={t("composer_title_ph")} />
        <div className="flex justify-between">
          <FieldError state={state} name="title" />
          <span className="hint ml-auto">
            {title.length}/{LIMITS.titleMax}
          </span>
        </div>
      </div>

      <div>
        <label htmlFor="body" className="label">
          {t("composer_body")}
        </label>
        <textarea id="body" name="body" required rows={5} maxLength={LIMITS.bodyMax} className="input rounded-[3px] resize-y" value={body} onChange={(e) => setBody(e.target.value)} placeholder={t("composer_body_ph")} />
        <div className="flex justify-between">
          <FieldError state={state} name="body" />
          <span className="hint ml-auto">
            {body.length}/{LIMITS.bodyMax}
          </span>
        </div>
      </div>

      <div>
        <span className="label">{t("composer_photos")}</span>
        <ImageUploader max={LIMITS.maxImages} onChange={setMediaIds} />
        <FieldError state={state} name="mediaIds" />
      </div>

      <section className="space-y-3">
        <h2 className="text-sm font-semibold">{t("composer_where")}</h2>
        <LocationPicker value={pin} onChange={setPin} />
        <FieldError state={state} name="location" />
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label htmlFor="upazilaId" className="label">
              {t("upazila")}
            </label>
            <select id="upazilaId" name="upazilaId" className="input rounded-[3px]" value={upazila} onChange={(e) => { setUpazila(e.target.value); setUnion(""); }} disabled={!!pin}>
              {upazilas.map((a) => (
                <option key={a.id} value={a.id}>
                  {a.name}
                </option>
              ))}
            </select>
            {pin && <input type="hidden" name="upazilaId" value={upazila} />}
          </div>
          <div>
            <label htmlFor="unionId" className="label">
              {t("union")}
            </label>
            <select id="unionId" name="unionId" className="input rounded-[3px]" value={union} onChange={(e) => setUnion(e.target.value)} disabled={!!pin}>
              <option value="">{t("select")}</option>
              {unions.map((a) => (
                <option key={a.id} value={a.id}>
                  {a.name}
                </option>
              ))}
            </select>
            {pin && <input type="hidden" name="unionId" value={union} />}
          </div>
        </div>
        <p className="hint !mt-0">{pin ? t("area_from_pin") : t("area_approx_hint")}</p>
        <div>
          <label htmlFor="landmark" className="label">
            {t("composer_landmark")} <span className="font-normal text-faint">({t("optional")})</span>
          </label>
          <input id="landmark" name="landmark" maxLength={LIMITS.landmarkMax} className="input rounded-[3px]" placeholder={t("composer_landmark_ph")} />
        </div>
      </section>

      {similar.length > 0 && (
        <section className="border-l-2 border-warn pl-3 py-2" aria-live="polite">
          <h2 className="flex items-center gap-2 text-sm font-semibold text-warn">
            <AlertTriangle className="h-4 w-4" aria-hidden="true" />
            {t("similar_title")}
          </h2>
          <p className="mt-1 text-xs text-muted">{t("similar_body")}</p>
          <ul className="mt-2 divide-y divide-line">
            {similar.map((s) => (
              <li key={s.id} className="flex items-center justify-between gap-3 py-1.5 text-sm">
                <span className="line-clamp-1" data-ugc>
                  {s.title}
                </span>
                <Link href={`/issues/${s.id}`} target="_blank" className="link shrink-0 text-xs font-semibold">
                  {t("open_issue")}
                </Link>
              </li>
            ))}
          </ul>
        </section>
      )}

      <section className="border-t border-line pt-4 space-y-3">
        <label className="flex cursor-pointer items-start gap-3 text-sm">
          <input type="checkbox" name="isUrgent" className="mt-1 h-4 w-4 accent-brand" />
          <span>
            <span className="flex items-center gap-1.5 font-semibold">
              <Flame className="h-4 w-4 text-danger" aria-hidden="true" />
              {t("composer_urgent")}
            </span>
            <span className="block text-xs text-muted">{t("composer_urgent_hint")}</span>
          </span>
        </label>
        <label className="flex cursor-pointer items-start gap-3 text-sm">
          <input type="checkbox" name="anonymous" className="mt-1 h-4 w-4 accent-brand" />
          <span>
            <span className="flex items-center gap-1.5 font-semibold">
              <EyeOff className="h-4 w-4 text-muted" aria-hidden="true" />
              {t("composer_anonymous")}
            </span>
            <span className="block text-xs text-muted">{t("composer_anonymous_hint")}</span>
          </span>
        </label>
      </section>

      <FormAlert state={state} />
      <div className="flex gap-3">
        <SubmitButton className="flex-1 rounded-[3px]">{t("composer_submit")}</SubmitButton>
        <Link href="/" className="btn-secondary rounded-[3px]">
          {t("cancel")}
        </Link>
      </div>
      <p className="text-xs text-faint">{t("emergency_note")}</p>
    </form>
  );
}

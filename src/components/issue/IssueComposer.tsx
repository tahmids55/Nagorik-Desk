"use client";

import { AlertTriangle, EyeOff } from "lucide-react";
import Link from "next/link";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
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

const DRAFT_KEY = "ngk:draft:new";
const DRAFT_MAX_AGE_MS = 7 * 24 * 60 * 60 * 1000;

type Draft = { category: string; title: string; body: string; landmark: string; savedAt: number };

function readDraft(): Draft | null {
  try {
    const raw = window.localStorage.getItem(DRAFT_KEY);
    if (!raw) return null;
    const d = JSON.parse(raw) as Partial<Draft> | null;
    if (!d || typeof d !== "object") return null;
    if (typeof d.savedAt !== "number" || Date.now() - d.savedAt > DRAFT_MAX_AGE_MS || d.savedAt > Date.now() + 60_000) return null;
    const pick = (v: unknown) => (typeof v === "string" ? v : "");
    const draft = { category: pick(d.category), title: pick(d.title), body: pick(d.body), landmark: pick(d.landmark), savedAt: d.savedAt };
    return draft.category || draft.title || draft.body || draft.landmark ? draft : null;
  } catch {
    return null;
  }
}

function writeDraft(v: Omit<Draft, "savedAt">) {
  try {
    if (!v.category && !v.title.trim() && !v.body.trim() && !v.landmark.trim()) window.localStorage.removeItem(DRAFT_KEY);
    else window.localStorage.setItem(DRAFT_KEY, JSON.stringify({ ...v, savedAt: Date.now() }));
  } catch {
    /* storage unavailable or full: drafts are best-effort */
  }
}

function clearDraft() {
  try {
    window.localStorage.removeItem(DRAFT_KEY);
  } catch {
    /* ignore */
  }
}

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
  const [landmark, setLandmark] = useState("");
  const [draftReady, setDraftReady] = useState(false);
  const [draftRestored, setDraftRestored] = useState(false);
  const latest = useRef({ category, title, body, landmark });
  latest.current = { category, title, body, landmark };
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Restore a saved draft once, on the client only.
  useEffect(() => {
    const d = readDraft();
    if (d) {
      setCategory(d.category);
      setTitle(d.title);
      setBody(d.body);
      setLandmark(d.landmark);
      setDraftRestored(true);
    }
    setDraftReady(true);
  }, []);

  // Debounced autosave.
  useEffect(() => {
    if (!draftReady) return;
    saveTimer.current = setTimeout(() => {
      saveTimer.current = null;
      writeDraft({ category, title, body, landmark });
    }, 500);
    return () => {
      if (saveTimer.current) clearTimeout(saveTimer.current);
      saveTimer.current = null;
    };
  }, [draftReady, category, title, body, landmark]);

  // The server rejected the submission: fields are unchanged, so keep the draft.
  useEffect(() => {
    if (!draftReady || !state) return;
    writeDraft(latest.current);
  }, [state, draftReady]);

  const onSubmit = useCallback(() => {
    const v = latest.current;
    if (v.category && v.title.trim().length >= LIMITS.titleMin && v.body.trim().length >= LIMITS.bodyMin) {
      if (saveTimer.current) clearTimeout(saveTimer.current);
      saveTimer.current = null;
      clearDraft();
    }
  }, []);

  const discardDraft = useCallback(() => {
    if (saveTimer.current) clearTimeout(saveTimer.current);
    saveTimer.current = null;
    setCategory("");
    setTitle("");
    setBody("");
    setLandmark("");
    setDraftRestored(false);
    clearDraft();
  }, []);

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
    <form action={action} onSubmit={onSubmit} className="space-y-6" noValidate>
      {draftRestored && (
        <p className="flex flex-wrap items-center gap-x-3 gap-y-1 border-l-2 border-brand pl-3 py-1 text-xs text-muted" aria-live="polite">
          <span>{t("draft_restored")}</span>
          <button type="button" onClick={discardDraft} className="font-medium text-brand underline-offset-2 hover:underline">
            {t("draft_discard")}
          </button>
        </p>
      )}

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
          <input id="landmark" name="landmark" maxLength={LIMITS.landmarkMax} className="input rounded-[3px]" value={landmark} onChange={(e) => setLandmark(e.target.value)} placeholder={t("composer_landmark_ph")} />
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

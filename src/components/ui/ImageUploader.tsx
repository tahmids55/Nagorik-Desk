"use client";

import { ImagePlus, Loader2, RotateCw, X } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import { useI18n } from "@/i18n/client";
import { cn } from "@/lib/cn";

type Item = { key: string; preview: string; status: "uploading" | "done" | "error"; progress: number; id?: string; error?: string; file: File };

const MAX_EDGE = 1600;

/** Shrink on the device first: faster uploads on slow mobile networks, and EXIF orientation is applied. */
async function compress(file: File): Promise<Blob> {
  try {
    const bmp = await createImageBitmap(file, { imageOrientation: "from-image" });
    const scale = Math.min(1, MAX_EDGE / Math.max(bmp.width, bmp.height));
    const canvas = document.createElement("canvas");
    canvas.width = Math.round(bmp.width * scale);
    canvas.height = Math.round(bmp.height * scale);
    canvas.getContext("2d")!.drawImage(bmp, 0, 0, canvas.width, canvas.height);
    bmp.close();
    const blob = await new Promise<Blob | null>((r) => canvas.toBlob(r, "image/jpeg", 0.82));
    return blob && blob.size < file.size ? blob : file;
  } catch {
    return file;
  }
}

function upload(blob: Blob, onProgress: (p: number) => void): Promise<{ ok: true; id: string } | { ok: false; code: string }> {
  return new Promise((resolve) => {
    const xhr = new XMLHttpRequest();
    xhr.open("POST", "/api/media");
    xhr.upload.onprogress = (e) => e.lengthComputable && onProgress(Math.round((e.loaded / e.total) * 100));
    xhr.onerror = () => resolve({ ok: false, code: "network" });
    xhr.onload = () => {
      try {
        const body = JSON.parse(xhr.responseText);
        resolve(body.ok ? { ok: true, id: body.id } : { ok: false, code: body.code ?? "failed" });
      } catch {
        resolve({ ok: false, code: "failed" });
      }
    };
    const form = new FormData();
    form.append("file", blob, "photo.jpg");
    xhr.send(form);
  });
}

export function ImageUploader({ max, onChange, label }: { max: number; onChange: (ids: string[]) => void; label?: string }) {
  const { t } = useI18n();
  const [items, setItems] = useState<Item[]>([]);
  const input = useRef<HTMLInputElement>(null);

  useEffect(() => {
    onChange(items.filter((i) => i.status === "done" && i.id).map((i) => i.id!));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [items]);

  useEffect(() => () => items.forEach((i) => URL.revokeObjectURL(i.preview)), []); // eslint-disable-line react-hooks/exhaustive-deps

  const patch = useCallback((key: string, p: Partial<Item>) => setItems((cur) => cur.map((i) => (i.key === key ? { ...i, ...p } : i))), []);

  const start = useCallback(
    async (item: Item) => {
      patch(item.key, { status: "uploading", progress: 0, error: undefined });
      const blob = await compress(item.file);
      const res = await upload(blob, (progress) => patch(item.key, { progress }));
      if (res.ok) patch(item.key, { status: "done", id: res.id, progress: 100 });
      else patch(item.key, { status: "error", error: res.code });
    },
    [patch],
  );

  const add = (files: FileList | null) => {
    if (!files) return;
    const room = max - items.length;
    const fresh = Array.from(files)
      .slice(0, Math.max(0, room))
      .map<Item>((file) => ({ key: crypto.randomUUID(), file, preview: URL.createObjectURL(file), status: "uploading", progress: 0 }));
    if (fresh.length === 0) return;
    setItems((cur) => [...cur, ...fresh]);
    fresh.forEach(start);
    if (input.current) input.current.value = "";
  };

  const remove = (key: string) =>
    setItems((cur) => {
      const gone = cur.find((i) => i.key === key);
      if (gone) URL.revokeObjectURL(gone.preview);
      return cur.filter((i) => i.key !== key);
    });

  return (
    <div>
      <div className="flex flex-wrap gap-2.5">
        {items.map((i) => (
          <div key={i.key} className="relative h-24 w-24 overflow-hidden rounded-[3px] border border-line bg-surface">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={i.preview} alt="" className={cn("h-full w-full object-cover", i.status !== "done" && "opacity-50")} />
            {i.status === "uploading" && (
              <div className="absolute inset-0 flex flex-col items-center justify-center gap-1 text-xs font-medium">
                <Loader2 className="h-5 w-5 animate-spin" aria-hidden="true" />
                {i.progress}%
              </div>
            )}
            {i.status === "error" && (
              <button type="button" onClick={() => start(i)} className="absolute inset-0 flex flex-col items-center justify-center gap-1 bg-bg/70 text-[11px] font-medium text-danger" aria-label={t("retry")}>
                <RotateCw className="h-5 w-5" aria-hidden="true" />
                {t("retry")}
              </button>
            )}
            <button type="button" onClick={() => remove(i.key)} className="absolute right-1 top-1 rounded-[3px] bg-bg/80 p-1 hover:bg-bg" aria-label={t("remove_photo")}>
              <X className="h-3.5 w-3.5" aria-hidden="true" />
            </button>
          </div>
        ))}
        {items.length < max && (
          <button type="button" onClick={() => input.current?.click()} className="flex h-24 w-24 flex-col items-center justify-center gap-1 rounded-[3px] border border-dashed border-line text-xs font-medium text-muted hover:border-line-strong hover:bg-neutral-fill">
            <ImagePlus className="h-6 w-6" aria-hidden="true" />
            {label ?? t("add_photo")}
          </button>
        )}
      </div>
      <input ref={input} type="file" accept="image/jpeg,image/png,image/webp" multiple className="sr-only" onChange={(e) => add(e.target.files)} aria-label={t("add_photo")} data-testid="photo-input" />
      {items.some((i) => i.status === "error") && <p className="field-error">{t("upload_failed")}</p>}
      <p className="hint">{t("photo_hint", { max })}</p>
    </div>
  );
}

import "server-only";
import type { z } from "zod";
import { fail } from "@/lib/action";

/** Turn FormData (or a plain object) into validated data, or a `validation` failure with per-field codes. */
export function parseInput<S extends z.ZodTypeAny>(
  schema: S,
  input: FormData | Record<string, unknown>,
): { data: z.infer<S> } | { error: ReturnType<typeof fail> } {
  const raw = input instanceof FormData ? Object.fromEntries(input.entries()) : input;
  const res = schema.safeParse(raw);
  if (res.success) return { data: res.data };
  const fields: Record<string, string> = {};
  for (const issue of res.error.issues) {
    const key = issue.path[0] !== undefined ? String(issue.path[0]) : "_";
    if (!(key in fields)) fields[key] = issue.message;
  }
  return { error: fail("validation", { fields }) };
}

export function pgErrorCode(e: unknown): string | undefined {
  const err = e as { code?: string; cause?: { code?: string } };
  return err?.code ?? err?.cause?.code;
}

export const isUniqueViolation = (e: unknown) => pgErrorCode(e) === "23505";

import "server-only";

type Level = "debug" | "info" | "warn" | "error";
const order: Record<Level, number> = { debug: 10, info: 20, warn: 30, error: 40 };
const REDACT = /(password|token|secret|code|email|phone|nid|authorization|cookie)/i;

function scrub(value: unknown, depth = 0): unknown {
  if (depth > 3 || value == null) return value;
  if (value instanceof Error) return { name: value.name, message: value.message };
  if (Array.isArray(value)) return value.map((v) => scrub(v, depth + 1));
  if (typeof value === "object") {
    return Object.fromEntries(
      Object.entries(value as Record<string, unknown>).map(([k, v]) => [k, REDACT.test(k) ? "[redacted]" : scrub(v, depth + 1)]),
    );
  }
  return value;
}

function emit(level: Level, msg: string, fields?: Record<string, unknown>) {
  const min = order[(process.env.LOG_LEVEL as Level) ?? "info"] ?? 20;
  if (order[level] < min) return;
  const line = JSON.stringify({ level, time: new Date().toISOString(), msg, ...(scrub(fields) as object) });
  (level === "error" ? console.error : console.log)(line);
}

/** Structured JSON logs. Fields whose names look sensitive are redacted. */
export const log = {
  debug: (msg: string, f?: Record<string, unknown>) => emit("debug", msg, f),
  info: (msg: string, f?: Record<string, unknown>) => emit("info", msg, f),
  warn: (msg: string, f?: Record<string, unknown>) => emit("warn", msg, f),
  error: (msg: string, f?: Record<string, unknown>) => emit("error", msg, f),
};

/** Build pg pool options from DATABASE_URL, making TLS explicit (Neon requires it). */
export function poolConfig(connectionString: string) {
  const url = new URL(connectionString);
  const sslmode = url.searchParams.get("sslmode");
  url.searchParams.delete("sslmode");
  url.searchParams.delete("channel_binding");
  const local = ["localhost", "127.0.0.1"].includes(url.hostname);
  return {
    connectionString: url.toString(),
    ssl: local && sslmode !== "require" ? false : { rejectUnauthorized: true },
    max: Number(process.env.DB_POOL_MAX ?? 5),
    idleTimeoutMillis: 20_000,
    connectionTimeoutMillis: 10_000,
    statement_timeout: 15_000,
  } as const;
}

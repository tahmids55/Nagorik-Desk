import "server-only";
import { drizzle, type NodePgDatabase } from "drizzle-orm/node-postgres";
import { Pool } from "pg";
import { poolConfig } from "./pool-config";
import * as schema from "./schema";

export type Db = NodePgDatabase<typeof schema>;

type Holder = { pool?: Pool; db?: Db };
const g = globalThis as unknown as { __ngk?: Holder };
const holder: Holder = (g.__ngk ??= {});

export function pool(): Pool {
  if (!holder.pool) {
    const url = process.env.DATABASE_URL;
    if (!url) throw new Error("DATABASE_URL is not set");
    holder.pool = new Pool(poolConfig(url));
    holder.pool.on("error", (err) => {
      // An idle client erroring must never crash the process.
      console.error(JSON.stringify({ level: "error", msg: "pg pool error", err: err.message }));
    });
  }
  return holder.pool;
}

export function db(): Db {
  if (!holder.db) holder.db = drizzle(pool(), { schema });
  return holder.db;
}

export type Tx = Parameters<Parameters<Db["transaction"]>[0]>[0];
export { schema };

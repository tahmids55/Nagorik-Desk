import { defineConfig } from "drizzle-kit";

export default defineConfig({
  dialect: "postgresql",
  schema: "./src/server/db/schema.ts",
  out: "./drizzle",
  schemaFilter: ["nagorik_pg"],
  migrations: { schema: "nagorik_pg", table: "__migrations" },
  dbCredentials: { url: process.env.DATABASE_URL ?? "" },
});

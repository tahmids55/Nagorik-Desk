/**
 * Server-side password reset for someone who cannot use email reset (e.g. before SMTP is configured).
 *
 *   npm run admin:reset-password -- --email person@example.org
 *
 * Needs shell access to the server, which is the point: it cannot be done from the website.
 * All of the person's sessions are revoked.
 */
import "./load-env";
import readline from "node:readline";
import { drizzle } from "drizzle-orm/node-postgres";
import { eq } from "drizzle-orm";
import { Pool } from "pg";
import { poolConfig } from "../src/server/db/pool-config";
import { auditLog, sessions, users } from "../src/server/db/schema";
import { checkPassword, hashPassword } from "../src/server/auth/password";
import { emailSchema } from "../src/lib/validation";

function arg(name: string): string | undefined {
  const i = process.argv.indexOf(`--${name}`);
  return i > -1 ? process.argv[i + 1] : undefined;
}

function ask(question: string, hidden = false): Promise<string> {
  const rl = readline.createInterface({ input: process.stdin, output: process.stdout, terminal: true });
  return new Promise((resolve) => {
    if (hidden) {
      const w = rl as unknown as { _writeToOutput: (s: string) => void };
      w._writeToOutput = (s: string) => {
        if (s.includes(question)) process.stdout.write(s);
      };
    }
    rl.question(question, (a) => {
      rl.close();
      if (hidden) process.stdout.write("\n");
      resolve(a);
    });
  });
}

async function main() {
  const url = process.env.DATABASE_URL;
  if (!url) throw new Error("DATABASE_URL is not set");
  const email = emailSchema.parse(arg("email") ?? (await ask("Account email: ")));
  const password = process.env.NEW_PASSWORD ?? (await ask("New password: ", true));

  const pool = new Pool({ ...poolConfig(url), max: 1 });
  const db = drizzle(pool);
  try {
    const [u] = await db.select().from(users).where(eq(users.email, email));
    if (!u || u.status === "deleted") throw new Error("No such account");
    const problem = checkPassword(password, { email, name: u.name });
    if (problem) throw new Error(`Password rejected: ${problem}`);
    await db.update(users).set({ passwordHash: await hashPassword(password) }).where(eq(users.id, u.id));
    await db.delete(sessions).where(eq(sessions.userId, u.id));
    await db.insert(auditLog).values({ actorId: null, action: "user.password_reset_cli", targetType: "user", targetId: u.id });
    console.log("Password updated and all sessions revoked.");
  } finally {
    await pool.end();
  }
}

main().catch((err) => {
  console.error("Failed:", err instanceof Error ? err.message : err);
  process.exit(1);
});

/**
 * Creates (or promotes) the first administrator. There is no default account and no default password.
 *
 *   npm run admin:create -- --email you@example.org --name "Your Name"
 *
 * The password is asked for interactively (hidden), or read from ADMIN_PASSWORD for automation.
 * The admin must enrol an authenticator app on first sign-in.
 */
import "./load-env";
import readline from "node:readline";
import { drizzle } from "drizzle-orm/node-postgres";
import { eq } from "drizzle-orm";
import { Pool } from "pg";
import { poolConfig } from "../src/server/db/pool-config";
import { auditLog, users } from "../src/server/db/schema";
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
      const w = (rl as unknown as { _writeToOutput: (s: string) => void });
      w._writeToOutput = (s: string) => {
        if (s.includes(question)) process.stdout.write(s);
      };
    }
    rl.question(question, (answer) => {
      rl.close();
      if (hidden) process.stdout.write("\n");
      resolve(answer);
    });
  });
}

async function main() {
  const url = process.env.DATABASE_URL;
  if (!url) throw new Error("DATABASE_URL is not set");

  const email = emailSchema.parse(arg("email") ?? (await ask("Admin email: ")));
  const name = (arg("name") ?? (await ask("Full name: "))).trim();
  if (name.length < 2) throw new Error("Name is too short");

  let password = process.env.ADMIN_PASSWORD;
  if (!password) {
    password = await ask("Password (min 10 chars): ", true);
    const again = await ask("Repeat password: ", true);
    if (password !== again) throw new Error("Passwords do not match");
  }
  const problem = checkPassword(password, { email, name });
  if (problem) throw new Error(`Password rejected: ${problem}`);

  const pool = new Pool({ ...poolConfig(url), max: 1 });
  const db = drizzle(pool);
  try {
    const hash = await hashPassword(password);
    const [existing] = await db.select({ id: users.id }).from(users).where(eq(users.email, email));
    let id: string;
    if (existing) {
      id = existing.id;
      await db
        .update(users)
        .set({ role: "admin", stakeholderId: null, passwordHash: hash, status: "active", totpSecretEnc: null, totpEnabledAt: null, recoveryCodes: null })
        .where(eq(users.id, id));
      console.log("Existing account promoted to admin; password reset; two-step login will be re-enrolled.");
    } else {
      const [row] = await db.insert(users).values({ name, email, passwordHash: hash, role: "admin", emailVerifiedAt: new Date() }).returning({ id: users.id });
      id = row!.id;
      console.log("Admin account created.");
    }
    await db.insert(auditLog).values({ actorId: null, action: "admin.bootstrap", targetType: "user", targetId: id });
    console.log("Sign in at /login. You will be asked to set up an authenticator app and save recovery codes.");
  } finally {
    await pool.end();
  }
}

main().catch((err) => {
  console.error("Failed:", err instanceof Error ? err.message : err);
  process.exit(1);
});

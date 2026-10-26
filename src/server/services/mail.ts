import "server-only";
import nodemailer, { type Transporter } from "nodemailer";
import { env, features } from "../env";
import { log } from "../log";

let transporter: Transporter | null = null;

/** Returns false (and sends nothing) when SMTP is not configured. Never pretends to have sent. */
export async function sendMail(input: { to: string; subject: string; text: string }): Promise<boolean> {
  if (!features().email) return false;
  const e = env();
  transporter ??= nodemailer.createTransport(e.SMTP_URL!);
  try {
    await transporter.sendMail({
      from: e.SMTP_FROM ?? "Nagorik PG <no-reply@localhost>",
      to: input.to,
      subject: input.subject,
      text: input.text,
    });
    return true;
  } catch (err) {
    log.error("mail send failed", { err: err instanceof Error ? err.message : String(err) });
    return false;
  }
}

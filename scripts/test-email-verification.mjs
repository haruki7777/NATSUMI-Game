import fs from "node:fs";
import path from "node:path";
import process from "node:process";
import { fileURLToPath } from "node:url";
import dotenv from "dotenv";
import nodemailer from "nodemailer";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

for (const file of [
  ".env",
  "shared-email-auth-memo.env",
  "../shared-email-auth-memo.env",
  "../game-center-email-auth-memo.env",
]) {
  const fullPath = path.resolve(root, file);
  if (fs.existsSync(fullPath)) dotenv.config({ path: fullPath, override: false });
}

const targets = [
  { key: "natsumi", prefix: "NATSUMI" },
  { key: "yuzuha", prefix: "YUZUHA" },
  { key: "game-center", prefix: "GAME_CENTER" },
];

const readEnv = (prefix, name, fallback = "") =>
  process.env[`${prefix}_${name}`] || process.env[name] || fallback;

const maskReason = (error) => {
  const message = String(error?.message || error || "unknown error");
  return message
    .replace(/(pass|password|token|secret|key)=([^&\s]+)/gi, "$1=***")
    .replace(/[A-Za-z0-9+/=]{24,}/g, "***");
};

const runTarget = async ({ key, prefix }) => {
  const host = readEnv(prefix, "SMTP_HOST");
  const port = Number(readEnv(prefix, "SMTP_PORT", "587"));
  const secure = String(readEnv(prefix, "SMTP_SECURE", "false")).toLowerCase() === "true";
  const user = readEnv(prefix, "SMTP_USER");
  const pass = readEnv(prefix, "SMTP_PASS");
  const from = readEnv(prefix, "SMTP_FROM") || readEnv(prefix, "AI_VERIFY_EMAIL_FROM") || user;
  const to = process.env.EMAIL_TEST_TO || user;

  const result = { target: key, configured: Boolean(host && user && pass && from), smtpVerifyOk: false, sent: false };
  if (!result.configured) return { ...result, reason: "missing smtp config" };

  const transporter = nodemailer.createTransport({
    host,
    port,
    secure,
    auth: { user, pass },
    connectionTimeout: 10_000,
    greetingTimeout: 10_000,
    socketTimeout: 15_000,
  });

  try {
    await transporter.verify();
    result.smtpVerifyOk = true;
    const code = String(Math.floor(100000 + Math.random() * 900000));
    await transporter.sendMail({
      from,
      to,
      subject: `[${key}] email verification smoke test`,
      text: `Verification test code: ${code}\nTarget: ${key}`,
    });
    result.sent = true;
    return result;
  } catch (error) {
    return { ...result, reason: maskReason(error) };
  }
};

for (const target of targets) {
  const result = await runTarget(target);
  console.log(JSON.stringify(result));
}

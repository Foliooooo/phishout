import nodemailer from "nodemailer";

export type AuthCodePurpose = "verify" | "reset";

const content = {
  admin: {
    subject: "Your PHISH//OUT admin sign-in code",
    heading: "Confirm admin sign-in.",
    instruction: "Enter this code on the PHISH//OUT admin sign-in screen.",
    ignore: "If you didn’t request this code, you can ignore this email.",
  },
  verify: {
    subject: "Verify your PHISH//OUT email",
    heading: "You’re almost in.",
    instruction: "Enter this code on the PHISH//OUT verification screen.",
    ignore: "If you didn’t create an account, you can ignore this email.",
  },
  reset: {
    subject: "Reset your PHISH//OUT password",
    heading: "Reset your password.",
    instruction: "Enter this code on the PHISH//OUT reset screen to choose a new password.",
    ignore: "If you didn’t request a reset, you can ignore this email.",
  },
};

export function authMailTransport() {
  const { SYSTEM_SMTP_HOST: host, SYSTEM_SMTP_USER: user, SYSTEM_SMTP_PASSWORD: pass } = process.env;
  const port = Number(process.env.SYSTEM_SMTP_PORT ?? "587");
  const security = process.env.SYSTEM_SMTP_SECURITY ?? "starttls";
  const capture = security === "capture" && host === "127.0.0.1" && process.env.PHISH_TEST_SMTP === "1";
  if (!host || !user || !pass || !process.env.SYSTEM_EMAIL_FROM ||
      !Number.isInteger(port) || port < 1 || port > 65535 ||
      (!capture && !["starttls", "tls"].includes(security))) {
    throw new Error("Authentication mail is not configured");
  }

  return nodemailer.createTransport({
    host, port,
    secure: security === "tls",
    requireTLS: security === "starttls",
    auth: { user, pass },
    connectionTimeout: 8_000,
    greetingTimeout: 8_000,
    socketTimeout: 12_000,
    disableFileAccess: true,
    disableUrlAccess: true,
  });
}

export async function sendAuthCode(to: string, code: string, purpose: AuthCodePurpose | "admin") {
  if (!/^\d{8}$/.test(code)) throw new Error("Invalid authentication code format");
  const { subject, heading, instruction, ignore } = content[purpose];

  const html = `<!doctype html>
<html lang="en">
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${subject}</title></head>
<body style="margin:0;background:#f4ebd9;color:#2b1d24;font-family:Arial,sans-serif;">
<table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background:#f4ebd9;"><tr><td align="center" style="padding:24px 12px;">
<table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width:540px;">
<tr><td style="padding:0 8px 18px;font-family:monospace;font-size:23px;font-weight:bold;">PHISH<span style="color:#af225d;">//</span>OUT</td></tr>
<tr><td style="padding:30px;background:#fbf5e9;border-radius:24px;">
<h1 style="margin:0 0 12px;font-size:32px;line-height:1.08;letter-spacing:-1px;">${heading}</h1>
<p style="margin:0 0 20px;font-size:16px;line-height:1.55;">${instruction}</p>
<p style="margin:0;background:#ff5fa2;color:#2b1d24;padding:16px 12px;border-radius:16px;text-align:center;font-family:monospace;font-weight:bold;font-size:26px;letter-spacing:3px;">${code}</p>
<p style="margin:18px 0 0;font-size:15px;line-height:1.5;">This code expires in 10 minutes. Keep it to yourself.</p>
</td></tr>
<tr><td style="padding:18px 8px;color:#6f5f62;font-size:14px;line-height:1.5;">${ignore}</td></tr>
</table></td></tr></table>
</body></html>`;

  await authMailTransport().sendMail({
    from: process.env.SYSTEM_EMAIL_FROM,
    to: { address: to, name: "" },
    subject,
    text: `${heading}\n\n${instruction}\n\n${code}\n\nThis code expires in 10 minutes. Keep it to yourself.\n\n${ignore}`,
    html,
  });
}

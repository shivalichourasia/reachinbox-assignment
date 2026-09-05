import nodemailer from "nodemailer";
export interface SenderCreds {
  smtpHost: string;
  smtpPort: number;
  smtpUser: string;
  smtpPass: string;
  fromAddress: string;
}
export function createTransport(creds: SenderCreds) {
  return nodemailer.createTransport({
    host: creds.smtpHost,
    port: creds.smtpPort,
    secure: false,
    auth: { user: creds.smtpUser, pass: creds.smtpPass },
  });
}
export async function sendMail(
  creds: SenderCreds,
  opts: { to: string; subject: string; html: string },
) {
  const transporter = createTransport(creds);
  const info = await transporter.sendMail({
    from: creds.fromAddress,
    to: opts.to,
    subject: opts.subject,
    html: opts.html,
  });
  const previewUrl = nodemailer.getTestMessageUrl(info);
  return { messageId: info.messageId, previewUrl };
}

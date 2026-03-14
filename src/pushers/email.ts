import nodemailer from "nodemailer";

export interface EmailPushOptions {
  host: string;
  port: number;
  secure: boolean;
  user: string;
  pass: string;
  from: string;
  to: string;
  subject: string;
  text: string;
  html?: string;
}

export async function renderEmailPreview(
  subject: string,
  text: string,
  html?: string,
): Promise<string> {
  const transport = nodemailer.createTransport({
    jsonTransport: true,
  });

  const info = await transport.sendMail({
    from: "preview@hot-ec-news.local",
    to: "preview@hot-ec-news.local",
    subject,
    text,
    html,
  });

  return typeof info.message === "string" ? info.message : JSON.stringify(info.message);
}

export async function sendEmailReport(options: EmailPushOptions): Promise<void> {
  const transport = nodemailer.createTransport({
    host: options.host,
    port: options.port,
    secure: options.secure,
    auth: {
      user: options.user,
      pass: options.pass,
    },
  });

  await transport.sendMail({
    from: options.from,
    to: options.to,
    subject: options.subject,
    text: options.text,
    html: options.html,
  });
}

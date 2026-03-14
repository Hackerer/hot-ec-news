import { writeFileSync } from "node:fs";
import path from "node:path";

import { loadAppConfig } from "../config/load-config.js";
import { renderEmailPreview, sendEmailReport } from "../pushers/email.js";
import { renderEmailHtml, renderPushDigestMarkdown } from "../pushers/render-digest.js";
import { buildWecomPayload, sendWecomReport } from "../pushers/wecom.js";
import { HotwordDatabase } from "../storage/database.js";
import { createAppPaths, ensureAppDirectories, resolveRootDir } from "../utils/paths.js";

type PushChannel = "wecom" | "email";

export interface PushLatestReportOptions {
  channel: PushChannel;
  explicitRoot?: string;
  dryRun?: boolean;
  webhookUrl?: string;
  smtpHost?: string;
  smtpPort?: number;
  smtpSecure?: boolean;
  smtpUser?: string;
  smtpPass?: string;
  emailFrom?: string;
  emailTo?: string;
}

export async function pushLatestReport(options: PushLatestReportOptions): Promise<string> {
  const rootDir = resolveRootDir(options.explicitRoot);
  const config = loadAppConfig(rootDir);
  const paths = createAppPaths(rootDir, config);
  ensureAppDirectories(paths);

  const database = new HotwordDatabase(paths.dbFile);
  database.init();
  const latest = database.getLatestReport();

  if (!latest) {
    throw new Error("No report available to push.");
  }

  const digestMarkdown = renderPushDigestMarkdown(latest.reportKey, latest.summary);
  const emailHtml = renderEmailHtml(latest.reportKey, latest.summary);
  const previewBase = path.join(paths.pushPreviewDir, `${latest.reportKey}-${options.channel}`);

  if (options.channel === "wecom") {
    if (options.dryRun || !options.webhookUrl) {
      const previewPath = `${previewBase}.json`;
      writeFileSync(previewPath, JSON.stringify(buildWecomPayload(digestMarkdown), null, 2), "utf8");
      return previewPath;
    }

    await sendWecomReport({
      webhookUrl: options.webhookUrl,
      markdown: digestMarkdown,
    });
    return latest.path;
  }

  if (
    options.dryRun ||
    !options.smtpHost ||
    !options.smtpUser ||
    !options.smtpPass ||
    !options.emailFrom ||
    !options.emailTo
  ) {
    const previewPath = `${previewBase}.json`;
    const preview = await renderEmailPreview(`hot-ec-news ${latest.reportKey}`, digestMarkdown, emailHtml);
    writeFileSync(previewPath, preview, "utf8");
    return previewPath;
  }

  await sendEmailReport({
    host: options.smtpHost,
    port: options.smtpPort ?? 465,
    secure: options.smtpSecure ?? true,
    user: options.smtpUser,
    pass: options.smtpPass,
    from: options.emailFrom,
    to: options.emailTo,
    subject: `hot-ec-news ${latest.reportKey}`,
    text: digestMarkdown,
    html: emailHtml,
  });

  return latest.path;
}

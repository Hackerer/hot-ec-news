import type { AppConfig, PushChannelConfig } from "../config/schema.js";
import { pushLatestReport, type PushLatestReportOptions } from "../pipeline/push-latest-report.js";

export async function pushConfiguredChannels(
  config: AppConfig,
  explicitRoot?: string,
): Promise<string[]> {
  const outputs: string[] = [];

  for (const channel of config.pushChannels) {
    if (!channel.enabled) {
      continue;
    }

    const options = buildPushOptions(channel, explicitRoot);
    const outputPath = await pushLatestReport(options);
    outputs.push(outputPath);
  }

  return outputs;
}

function buildPushOptions(channel: PushChannelConfig, explicitRoot?: string) {
  if (channel.type === "wecom") {
    const options: PushLatestReportOptions = {
      channel: "wecom" as const,
      dryRun: channel.dryRun,
    };
    if (explicitRoot) options.explicitRoot = explicitRoot;
    if (channel.webhookUrl) options.webhookUrl = channel.webhookUrl;
    return options;
  }

  const options: PushLatestReportOptions = {
    channel: "email" as const,
    dryRun: channel.dryRun,
  };
  if (explicitRoot) options.explicitRoot = explicitRoot;
  if (channel.smtpHost) options.smtpHost = channel.smtpHost;
  if (channel.smtpPort) options.smtpPort = channel.smtpPort;
  if (channel.smtpSecure !== undefined) options.smtpSecure = channel.smtpSecure;
  if (channel.smtpUser) options.smtpUser = channel.smtpUser;
  if (channel.smtpPass) options.smtpPass = channel.smtpPass;
  if (channel.emailFrom) options.emailFrom = channel.emailFrom;
  if (channel.emailTo) options.emailTo = channel.emailTo;
  return options;
}

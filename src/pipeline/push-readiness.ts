import type { PushChannelConfig } from "../config/schema.js";

export interface PushChannelStatus {
  type: PushChannelConfig["type"];
  enabled: boolean;
  dryRun: boolean;
  readiness: "disabled" | "preview_only" | "ready" | "misconfigured";
  detail: string;
}

export function getPushChannelStatus(channel: PushChannelConfig): PushChannelStatus {
  if (!channel.enabled) {
    return {
      type: channel.type,
      enabled: false,
      dryRun: channel.dryRun,
      readiness: "disabled",
      detail: "channel disabled",
    };
  }

  if (channel.dryRun) {
    return {
      type: channel.type,
      enabled: true,
      dryRun: true,
      readiness: "preview_only",
      detail: "dry-run only",
    };
  }

  if (channel.type === "wecom") {
    return channel.webhookUrl
      ? {
          type: channel.type,
          enabled: true,
          dryRun: false,
          readiness: "ready",
          detail: "webhook configured",
        }
      : {
          type: channel.type,
          enabled: true,
          dryRun: false,
          readiness: "misconfigured",
          detail: "missing webhookUrl",
        };
  }

  const missingFields = [
    !channel.smtpHost && "smtpHost",
    !channel.smtpUser && "smtpUser",
    !channel.smtpPass && "smtpPass",
    !channel.emailFrom && "emailFrom",
    !channel.emailTo && "emailTo",
  ].filter(Boolean);

  return missingFields.length === 0
    ? {
        type: channel.type,
        enabled: true,
        dryRun: false,
        readiness: "ready",
        detail: "smtp delivery configured",
      }
    : {
        type: channel.type,
        enabled: true,
        dryRun: false,
        readiness: "misconfigured",
        detail: `missing ${missingFields.join(", ")}`,
      };
}

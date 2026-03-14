import { mkdtempSync, mkdirSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";

import { describe, expect, test } from "vitest";

import { runDoctor } from "../src/pipeline/doctor.js";

describe("runDoctor", () => {
  test("fails when auto push is enabled without a ready channel", () => {
    const rootDir = mkdtempSync(path.join(tmpdir(), "hot-ec-news-doctor-"));
    mkdirSync(path.join(rootDir, "config"), { recursive: true });
    writeFileSync(
      path.join(rootDir, "config", "app.json"),
      JSON.stringify({
        autoPushOnDaily: true,
        pushChannels: [
          {
            type: "wecom",
            enabled: true,
            dryRun: false,
          },
        ],
      }),
      "utf8",
    );

    const result = runDoctor(rootDir, {
      runtimePlatform: "linux",
    });

    expect(result.ok).toBe(false);
    expect(result.checks.find((check) => check.id === "push-ready")?.level).toBe("fail");
  });

  test("warns when auto push is preview-only and passes when delivery is configured", () => {
    const previewRoot = mkdtempSync(path.join(tmpdir(), "hot-ec-news-doctor-"));
    mkdirSync(path.join(previewRoot, "config"), { recursive: true });
    writeFileSync(
      path.join(previewRoot, "config", "app.json"),
      JSON.stringify({
        autoPushOnDaily: true,
        pushChannels: [
          {
            type: "wecom",
            enabled: true,
            dryRun: true,
          },
        ],
      }),
      "utf8",
    );

    const preview = runDoctor(previewRoot, {
      runtimePlatform: "linux",
    });
    expect(preview.ok).toBe(true);
    expect(preview.checks.find((check) => check.id === "push-ready")?.level).toBe("warn");

    const readyRoot = mkdtempSync(path.join(tmpdir(), "hot-ec-news-doctor-"));
    mkdirSync(path.join(readyRoot, "config"), { recursive: true });
    writeFileSync(
      path.join(readyRoot, "config", "app.json"),
      JSON.stringify({
        autoPushOnDaily: true,
        pushChannels: [
          {
            type: "email",
            enabled: true,
            dryRun: false,
            smtpHost: "smtp.example.com",
            smtpUser: "bot",
            smtpPass: "secret",
            emailFrom: "bot@example.com",
            emailTo: "ops@example.com",
          },
        ],
      }),
      "utf8",
    );

    const ready = runDoctor(readyRoot, {
      runtimePlatform: "linux",
    });
    expect(ready.ok).toBe(true);
    expect(ready.checks.find((check) => check.id === "push-ready")?.level).toBe("pass");
  });
});

import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";

import { describe, expect, test } from "vitest";

import { buildDailyReport } from "../src/core/aggregate.js";
import { getFixtureHotwords } from "../src/fixtures/hotwords.js";
import { HotwordDatabase } from "../src/storage/database.js";

describe("HotwordDatabase", () => {
  test("stores and lists collected hotwords", () => {
    const workingDir = mkdtempSync(path.join(tmpdir(), "hot-ec-news-db-"));
    const database = new HotwordDatabase(path.join(workingDir, "hot-ec-news.sqlite"));
    database.init();
    database.insertHotwords(getFixtureHotwords());

    const records = database.listHotwords(5);
    expect(records).toHaveLength(5);
    expect(records[0]?.keyword).toBeTruthy();
  });

  test("prefers validated reports over newer fixture reports", () => {
    const workingDir = mkdtempSync(path.join(tmpdir(), "hot-ec-news-db-"));
    const database = new HotwordDatabase(path.join(workingDir, "hot-ec-news.sqlite"));
    database.init();

    const validated = buildDailyReport([], "Asia/Shanghai");
    validated.generatedAt = "2026-03-14T09:00:00.000Z";
    const fixture = buildDailyReport([], "Asia/Shanghai");
    fixture.generatedAt = "2026-03-14T10:00:00.000Z";

    database.saveReport("validated-2026-03-14", "markdown", "/tmp/validated.md", validated);
    database.saveReport("fixture-2026-03-14", "markdown", "/tmp/fixture.md", fixture);

    const latest = database.getLatestReport();

    expect(latest?.reportKey).toBe("validated-2026-03-14");
  });
});

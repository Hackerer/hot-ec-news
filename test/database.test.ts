import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";

import { describe, expect, test } from "vitest";

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
});

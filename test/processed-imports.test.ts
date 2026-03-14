import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";

import { describe, expect, test } from "vitest";

import {
  buildImportFileFingerprint,
  importThirdPartyFile,
} from "../src/pipeline/import-third-party.js";
import { HotwordDatabase } from "../src/storage/database.js";

describe("processed imports ledger", () => {
  test("stores processed import signatures after successful import", () => {
    const rootDir = mkdtempSync(path.join(tmpdir(), "hot-ec-news-import-ledger-"));
    const filePath = path.resolve("fixtures/third-party/chanmama-sample.csv");
    const result = importThirdPartyFile("chanmama", filePath, rootDir, "2026-03-14T10:00:00+08:00");

    const database = new HotwordDatabase(path.join(rootDir, "data", "db", "hot-ec-news.sqlite"));
    database.init();
    const entries = database.listProcessedImports(5);
    const fingerprint = buildImportFileFingerprint(filePath);

    expect(result.fileHash).toBe(fingerprint.fileHash);
    expect(entries[0]?.fileName).toBe("chanmama-sample.csv");
    expect(database.hasProcessedImport("chanmama", "chanmama-sample.csv", fingerprint.fileHash)).toBe(true);
  });
});

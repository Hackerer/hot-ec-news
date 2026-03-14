import type { DailyReport } from "../types/hotword.js";

export function renderMarkdownReport(report: DailyReport): string {
  const lines: string[] = [
    "# 每日电商热词日报",
    "",
    `生成时间：${report.generatedAt}`,
    `时区：${report.timezone}`,
    "",
    "## 总览",
    "",
    `- 采集词条：${report.totals.collected}`,
    `- 聚合后词条：${report.totals.aggregated}`,
    `- 覆盖类目：${report.totals.categories}`,
    "",
  ];

  for (const section of report.sections) {
    lines.push(`## ${section.title}`, "");
    if (section.items.length === 0) {
      lines.push("- 当日暂无词条", "");
      continue;
    }

    for (const [index, item] of section.items.entries()) {
      lines.push(
        `${index + 1}. ${item.keyword} | 分数 ${item.score.toFixed(2)} | 最优排名 ${item.bestRank} | 来源 ${item.providers.join(", ")}`,
      );
    }
    lines.push("");
  }

  return `${lines.join("\n").trim()}\n`;
}

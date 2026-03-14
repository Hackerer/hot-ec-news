import type { DailyReport } from "../types/hotword.js";

const confidenceBandLabels = {
  high: "高",
  medium: "中",
  low: "低",
} as const;

const validationStatusLabels = {
  validated: "已第二信源校验",
  primary_only: "仅第一信源",
  secondary_only: "仅第二信源",
} as const;

const reviewFlagLabels = {
  single_source: "单一信源",
  secondary_only: "仅第二信源",
  new_unvalidated: "新词未完成校验",
  low_confidence: "低可信度",
} as const;

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
    `- 已经第二信源校验：${report.totals.validated}`,
    `- 仅第一信源：${report.totals.primaryOnly}`,
    `- 仅第二信源：${report.totals.secondaryOnly}`,
    `- 新增词：${report.totals.newEntries}`,
    `- 连续上榜词：${report.totals.repeatedEntries}`,
    `- 高可信词：${report.totals.highConfidence}`,
    `- 中可信词：${report.totals.mediumConfidence}`,
    `- 低可信词：${report.totals.lowConfidence}`,
    `- 待人工复核：${report.totals.reviewNeeded}`,
    "",
  ];

  for (const section of report.sections) {
    lines.push(`## ${section.title}`, "");
    if (section.items.length === 0) {
      lines.push("- 当日暂无词条", "");
      continue;
    }

    for (const [index, item] of section.items.entries()) {
      const trendLabel =
        item.trend.status === "new"
          ? "新上榜"
          : `较上次 ${item.trend.deltaScore >= 0 ? "+" : ""}${item.trend.deltaScore.toFixed(2)}`;
      lines.push(
        `${index + 1}. ${item.keyword} | 分数 ${item.score.toFixed(2)} | ${trendLabel} | 可信度 ${confidenceBandLabels[item.confidenceBand]} ${item.confidence.toFixed(2)} | 最优排名 ${item.bestRank} | 来源 ${item.providers.join(", ")}`,
      );
    }
    lines.push("");
  }

  lines.push("## 第三方校验结果", "");
  if (report.validationHighlights.length === 0) {
    lines.push("- 当前没有完成第二信源校验的词条", "");
  } else {
    for (const [index, item] of report.validationHighlights.entries()) {
      lines.push(
        `${index + 1}. ${item.keyword} | 置信度 ${confidenceBandLabels[item.confidenceBand]} ${item.confidence.toFixed(2)} | 第二信源 ${item.secondaryProviders.join(", ")}`,
      );
    }
    lines.push("");
  }

  lines.push("## 高可信热词", "");
  if (report.confidenceHighlights.length === 0) {
    lines.push("- 当前没有高可信词", "");
  } else {
    for (const [index, item] of report.confidenceHighlights.entries()) {
      const trendLabel =
        item.trend.status === "new"
          ? "新上榜"
          : `变化 ${item.trend.deltaScore >= 0 ? "+" : ""}${item.trend.deltaScore.toFixed(2)}`;
      lines.push(
        `${index + 1}. ${item.keyword} | 可信度 ${confidenceBandLabels[item.confidenceBand]} ${item.confidence.toFixed(2)} | ${validationStatusLabels[item.validationStatus]} | ${trendLabel}`,
      );
    }
    lines.push("");
  }

  lines.push("## 待人工复核", "");
  if (report.reviewHighlights.length === 0) {
    lines.push("- 当前没有需要复核的词", "");
  } else {
    for (const [index, item] of report.reviewHighlights.entries()) {
      const reasons = item.reviewFlags.map((flag) => reviewFlagLabels[flag]).join("、");
      lines.push(
        `${index + 1}. ${item.keyword} | 可信度 ${confidenceBandLabels[item.confidenceBand]} ${item.confidence.toFixed(2)} | 原因 ${reasons}`,
      );
    }
    lines.push("");
  }

  lines.push("## 新增爆发词", "");
  if (report.newHighlights.length === 0) {
    lines.push("- 当前没有新增词", "");
  } else {
    for (const [index, item] of report.newHighlights.entries()) {
      lines.push(
        `${index + 1}. ${item.keyword} | 分数 ${item.score.toFixed(2)} | 可信度 ${confidenceBandLabels[item.confidenceBand]} ${item.confidence.toFixed(2)} | 来源 ${item.providers.join(", ")}`,
      );
    }
    lines.push("");
  }

  lines.push("## 连续上榜词", "");
  if (report.repeatedHighlights.length === 0) {
    lines.push("- 当前没有连续上榜词", "");
  } else {
    for (const [index, item] of report.repeatedHighlights.entries()) {
      lines.push(
        `${index + 1}. ${item.keyword} | 当前 ${item.score.toFixed(2)} | 变化 ${item.trend.deltaScore >= 0 ? "+" : ""}${item.trend.deltaScore.toFixed(2)}`,
      );
    }
    lines.push("");
  }

  lines.push("## 备注与异常说明", "");
  if (report.warnings.length === 0) {
    lines.push("- 当次运行无异常", "");
  } else {
    for (const warning of report.warnings) {
      lines.push(`- ${warning}`);
    }
    lines.push("");
  }

  return `${lines.join("\n").trim()}\n`;
}

import type { AggregatedHotword, DailyReport } from "../types/hotword.js";

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

const sourceTierLabels = {
  primary: "第一信源",
  secondary: "第二信源",
} as const;

function getReportItems(items: AggregatedHotword[] | undefined): AggregatedHotword[] {
  return Array.isArray(items) ? items : [];
}

function getOverallItems(section: DailyReport["sections"][number]): AggregatedHotword[] {
  return getReportItems(section.overallItems ?? section.items);
}

function getPlatformSections(section: DailyReport["sections"][number]) {
  return Array.isArray(section.platformSections) ? section.platformSections : [];
}

function getWarnings(report: DailyReport): string[] {
  return Array.isArray(report.warnings) ? report.warnings : [];
}

function getTotals(report: DailyReport) {
  return {
    aggregated: report.totals.aggregated ?? 0,
    highConfidence: report.totals.highConfidence ?? 0,
    reviewNeeded: report.totals.reviewNeeded ?? 0,
    newEntries: report.totals.newEntries ?? 0,
  };
}

function escapeHtml(value: string): string {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

function formatHotwordLine(item: AggregatedHotword): string {
  const trend =
    item.trend.status === "new"
      ? "新上榜"
      : `变化 ${item.trend.deltaScore >= 0 ? "+" : ""}${item.trend.deltaScore.toFixed(2)}`;

  return `- ${item.keyword} | ${trend} | 可信度 ${confidenceBandLabels[item.confidenceBand]} ${item.confidence.toFixed(2)}`;
}

export function renderPushDigestMarkdown(reportKey: string, report: DailyReport): string {
  const totals = getTotals(report);
  const lines: string[] = [
    `# hot-ec-news ${reportKey}`,
    "",
    `生成时间：${report.generatedAt}`,
    `总词条：${totals.aggregated}，高可信：${totals.highConfidence}，待复核：${totals.reviewNeeded}，新增：${totals.newEntries}`,
  ];

  for (const section of report.sections) {
    lines.push("", `## ${section.title}`, "", "### 整体搜索热词 Top15");
    const overallItems = getOverallItems(section);
    if (overallItems.length === 0) {
      lines.push("- 当前没有类目词");
    } else {
      for (const [index, item] of overallItems.slice(0, 15).entries()) {
        lines.push(`${index + 1}. ${formatHotwordLine(item).slice(2)}`);
      }
    }

    for (const platformSection of getPlatformSections(section)) {
      lines.push(
        "",
        `### ${platformSection.title} Top15（${sourceTierLabels[platformSection.sourceTier]}，共 ${platformSection.totalItems} 词）`,
      );

      if (platformSection.items.length === 0) {
        lines.push("- 当前没有平台词");
        continue;
      }

      for (const [index, item] of platformSection.items.slice(0, 15).entries()) {
        lines.push(`${index + 1}. ${formatHotwordLine(item).slice(2)}`);
      }
    }
  }

  if (getWarnings(report).length > 0) {
    lines.push("", "## 异常", ...getWarnings(report).slice(0, 3).map((warning) => `- ${warning}`));
  }

  return `${lines.join("\n").trim()}\n`;
}

function renderHtmlList(items: AggregatedHotword[], emptyText: string, includeReviewReason = false): string {
  if (items.length === 0) {
    return `<p>${emptyText}</p>`;
  }

  const rows = items
    .slice(0, 5)
    .map((item) => {
      const trend =
        item.trend.status === "new"
          ? "新上榜"
          : `${item.trend.deltaScore >= 0 ? "+" : ""}${item.trend.deltaScore.toFixed(2)}`;
      const reviewReason = includeReviewReason
        ? `<td>${escapeHtml(item.reviewFlags.join(", "))}</td>`
        : "";

      return `<tr><td>${escapeHtml(item.keyword)}</td><td>${escapeHtml(trend)}</td><td>${confidenceBandLabels[item.confidenceBand]} ${item.confidence.toFixed(
        2,
      )}</td><td>${validationStatusLabels[item.validationStatus]}</td>${reviewReason}</tr>`;
    })
    .join("");

  const reviewHead = includeReviewReason ? "<th>复核原因</th>" : "";
  return `<table><thead><tr><th>关键词</th><th>趋势</th><th>可信度</th><th>校验状态</th>${reviewHead}</tr></thead><tbody>${rows}</tbody></table>`;
}

export function renderEmailHtml(reportKey: string, report: DailyReport): string {
  const totals = getTotals(report);
  const categorySections = report.sections
    .map((section) => {
      const platformBlocks = getPlatformSections(section)
        .map(
          (platformSection) => `<h3>${escapeHtml(platformSection.title)} Top15（${sourceTierLabels[platformSection.sourceTier]}，共 ${platformSection.totalItems} 词）</h3>
    ${renderHtmlList(platformSection.items, "当前没有平台词条")}`,
        )
        .join("");

      return `<section>
    <h2>${escapeHtml(section.title)}</h2>
    <h3>整体搜索热词 Top15</h3>
    ${renderHtmlList(getOverallItems(section), "当前没有类目词条")}
    ${platformBlocks}
  </section>`;
    })
    .join("");

  return `<!doctype html>
<html lang="zh-CN">
  <head>
    <meta charset="utf-8" />
    <title>hot-ec-news ${escapeHtml(reportKey)}</title>
    <style>
      body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif; margin: 24px; color: #111827; }
      h1, h2 { margin-bottom: 12px; }
      .summary { display: grid; grid-template-columns: repeat(4, minmax(0, 1fr)); gap: 12px; margin: 20px 0; }
      .card { background: #f3f4f6; border-radius: 12px; padding: 16px; }
      .value { font-size: 24px; font-weight: 700; }
      table { width: 100%; border-collapse: collapse; margin-bottom: 24px; }
      th, td { border-bottom: 1px solid #e5e7eb; padding: 10px 8px; text-align: left; vertical-align: top; }
      th { background: #f9fafb; }
      .warning { color: #b45309; }
    </style>
  </head>
  <body>
    <h1>hot-ec-news ${escapeHtml(reportKey)}</h1>
    <p>生成时间：${escapeHtml(report.generatedAt)}</p>
    <div class="summary">
      <div class="card"><div>聚合词条</div><div class="value">${totals.aggregated}</div></div>
      <div class="card"><div>高可信</div><div class="value">${totals.highConfidence}</div></div>
      <div class="card"><div>待复核</div><div class="value">${totals.reviewNeeded}</div></div>
      <div class="card"><div>新增词</div><div class="value">${totals.newEntries}</div></div>
    </div>
    ${categorySections}
    <h2>高可信热词</h2>
    ${renderHtmlList(getReportItems(report.confidenceHighlights), "当前没有高可信词")}
    <h2>新增爆发词</h2>
    ${renderHtmlList(getReportItems(report.newHighlights), "当前没有新增词")}
    <h2>待人工复核</h2>
    ${renderHtmlList(getReportItems(report.reviewHighlights), "当前没有需要复核的词", true)}
    ${
      getWarnings(report).length > 0
        ? `<h2>异常</h2><ul>${getWarnings(report)
            .slice(0, 3)
            .map((warning) => `<li class="warning">${escapeHtml(warning)}</li>`)
            .join("")}</ul>`
        : ""
    }
  </body>
</html>`;
}

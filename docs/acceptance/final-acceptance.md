# 最终验收

日期：2026-03-14

## 版本清单

1. `v1` 基础框架、CLI、SQLite、fixture 日报
2. `v2` 淘宝/京东真实主信源采集
3. `v3` 第三方 CSV 导入与校验层
4. `v4` daily 管道、推送预览、双平台调度脚本
5. `v5` 重试、失败隔离、错误快照、异常说明
6. `v6` 配置驱动、注册表架构、自动推送编排
7. `v7` 历史对比、新增爆发词、连续上榜词
8. `v8` 可信度分层、高可信词、待人工复核清单
9. `v9` 摘要推送、邮件 HTML 预览、推送内容与报告解耦
10. `v10` 同日幂等、配置路径生效、类目配置生效、邮件 HTML 转义
11. `v11` 调度安装、调度状态、调度移除闭环
12. `v12` 交付状态总览，统一报告/调度/推送准备度
13. `v13` third-party processed ledger，避免重复扫描重复导入
14. `v14` doctor 生产预检，提前识别交付失败风险
15. `v15` pipeline run audit，记录最近一次 `run:daily` 的输入输出与结果

## 验收项

- 可在 `macOS` 和 `Windows` 设计路径上运行
- 可采集真实主信源
- 可导入第三方第二信源
- 可生成校验日报
- 可生成推送预览
- 可生成双平台调度脚本
- 单平台失败时仍可继续运行
- 可通过 `config/app.json` 控制信源、推送和调度默认值
- 日报可展示历史对比结果
- 日报可展示可信度分层与人工复核优先级
- 推送预览可输出适合运营消费的摘要内容
- 重复执行同日 pipeline 不会继续放大数据
- 自定义报告路径、数据库路径和类目配置会实际生效
- 调度能力不仅能生成文件，还能安装、查看状态和移除
- 可一眼查看当前系统是否具备日报、调度和推送交付条件
- 第三方自动导入可识别“已处理文件”并自动跳过
- 可在真正开启日推前先跑生产预检
- 可回看最近一次 `run:daily` 的导入、跳过、告警和结果

## 实际结果

- 自动化测试：`39` 项全部通过
- 主信源采集：在干净目录中成功采集并生成日报
- 第三方校验：成功导入 `chanmama` 样例并生成校验结果
- 推送：成功生成 `WeCom` 和 `Email` dry-run 预览
- 调度：成功生成 `launchd plist` 和 `Windows Task Scheduler ps1`
- 稳定性：失败注入测试通过，异常会落盘到错误快照
- 配置驱动：`run:daily` 已能根据 `config/app.json` 自动触发推送预览
- 趋势对比：报告已能输出新增词和连续上榜词
- 可信度分层：报告已能输出高可信热词和待人工复核队列
- 干净目录验收：多信源场景已生成高可信热词，单一主信源场景已生成非空复核队列
- 推送摘要：`WeCom` dry-run 已输出摘要 Markdown，`Email` dry-run 已输出包含 HTML 的预览
- 干净目录验收：`run:daily` 已同时生成 `WeCom / Email` 摘要预览文件
- 幂等性：同日连续执行两次 `run:daily` 后，当日记录数保持不变
- 配置生效：自定义 `reportDir` / `databasePath` 已实际落盘，`categories: [\"apparel\"]` 时报告只输出服饰区块
- 调度闭环：已支持 `schedule:install / schedule:status / schedule:remove`，并通过无副作用验收验证 macOS 执行路径与 Windows 脚本生成路径
- 状态总览：`status` 已能输出最新报告摘要、调度产物、启用信源和推送准备度
- processed ledger：第二次扫描同一第三方 CSV 时会进入 `Skipped files`，不会再次导入
- 生产预检：`doctor` 已能区分 fail / warn / pass，并识别 push misconfigured / preview_only / ready
- run audit：`status` 已能展示最近一次 `run:daily` 的状态、导入文件、跳过文件和告警数量

## 推荐生产使用方式

1. 在本地安装 Node.js 22+
2. `npm install`
3. `npm run init`
4. 每天将第三方导出文件放入 `data/imports`
5. 配置企业微信 webhook 或 SMTP
6. 用 `npm run schedule:generate` 生成对应平台脚本
7. 执行 `npm run run:daily`

## 备注

- 真实第三方平台接入当前以 CSV 导入为主，这是为了保证稳定性和可维护性。
- `node:sqlite` 目前在 Node 25 下会提示实验性警告，但功能已稳定可用。

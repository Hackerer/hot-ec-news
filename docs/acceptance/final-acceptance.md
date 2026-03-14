# 最终验收

日期：2026-03-14

## 版本清单

1. `v1` 基础框架、CLI、SQLite、fixture 日报
2. `v2` 淘宝/京东真实主信源采集
3. `v3` 第三方 CSV 导入与校验层
4. `v4` daily 管道、推送预览、双平台调度脚本
5. `v5` 重试、失败隔离、错误快照、异常说明
6. `v6` 配置驱动、注册表架构、自动推送编排

## 验收项

- 可在 `macOS` 和 `Windows` 设计路径上运行
- 可采集真实主信源
- 可导入第三方第二信源
- 可生成校验日报
- 可生成推送预览
- 可生成双平台调度脚本
- 单平台失败时仍可继续运行
- 可通过 `config/app.json` 控制信源、推送和调度默认值

## 实际结果

- 自动化测试：`15` 项全部通过
- 主信源采集：在干净目录中成功采集并生成日报
- 第三方校验：成功导入 `chanmama` 样例并生成校验结果
- 推送：成功生成 `WeCom` 和 `Email` dry-run 预览
- 调度：成功生成 `launchd plist` 和 `Windows Task Scheduler ps1`
- 稳定性：失败注入测试通过，异常会落盘到错误快照
- 配置驱动：`run:daily` 已能根据 `config/app.json` 自动触发推送预览

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

# 技术方案

更新时间：2026-03-14

## 1. 技术目标

把当前项目从“能跑的脚本集合”升级成“可持续扩展的本地情报系统”。

目标包括：

- 配置驱动
- 适配器注册表
- 统一推送层
- 双端调度
- 失败隔离

## 2. 借鉴的技术精髓

### 2.1 RSSHub：Route/Adapter 架构

技术要点：

- 入口统一
- 源逻辑独立
- 输出结构标准化

落地到当前仓库：

- `src/collectors/registry.ts`
- `src/importers/registry.ts`

这意味着新增平台时，不再修改主流程判断分支，而是注册新 adapter。

参考：

- https://github.com/DIYgod/RSSHub

### 2.2 TrendRadar：产品流由配置驱动

技术要点：

- 多平台、多关键词、多推送通道都应该配置化

落地到当前仓库：

- `config/app.example.json`
- `src/config/load-config.ts`
- `src/config/schema.ts`

配置项覆盖：

- seeds
- sources
- pushChannels
- scheduler
- autoPushOnDaily

参考：

- https://github.com/sansan0/TrendRadar

### 2.3 Apprise：通知抽象统一化

技术要点：

- 通知不要硬编码在业务流程里
- 统一封装不同渠道

落地到当前仓库：

- `src/pushers/wecom.ts`
- `src/pushers/email.ts`
- `src/pushers/registry.ts`

参考：

- https://github.com/caronc/apprise

### 2.4 Crawlee：失败必须可控

技术要点：

- retry
- isolate failure
- snapshot for debugging

落地到当前仓库：

- `src/utils/retry.ts`
- `src/utils/error-snapshots.ts`
- `src/pipeline/run-live-collection.ts`

参考：

- https://github.com/apify/crawlee

## 3. 当前技术架构

当前建议结构：

1. Config Layer
2. Source Registry Layer
3. Collection / Import Layer
4. Aggregation / Validation Layer
5. Report Layer
6. Push Layer
7. Schedule Layer

## 4. 当前关键模块

### Config

- `src/config/schema.ts`
- `src/config/defaults.ts`
- `src/config/load-config.ts`

### Live Collectors

- `src/collectors/taobao-suggestions.ts`
- `src/collectors/jd-suggestions.ts`
- `src/collectors/registry.ts`

### Third-party Import

- `src/importers/third-party-csv.ts`
- `src/importers/registry.ts`

### Pipeline

- `src/pipeline/run-live-collection.ts`
- `src/pipeline/import-third-party.ts`
- `src/pipeline/run-daily.ts`

### Push

- `src/pushers/wecom.ts`
- `src/pushers/email.ts`
- `src/pushers/registry.ts`

### Schedule

- `src/schedulers/launchd.ts`
- `src/schedulers/windows-task-scheduler.ts`

## 5. 当前技术决策

### 为什么继续选 Node.js

- Playwright 生态成熟
- 本地 CLI 和调度整合方便
- Windows / macOS 双端成本低
- `node:sqlite` 足够支撑当前规模

### 为什么第三方先做 CSV 导入

- 比网页逆向更稳定
- 更贴近真实业务使用
- 可以先完成校验链路，再逐步升级到自动接入

### 为什么先做 registry，再接更多平台

- 不先做 registry，平台一多主流程会迅速腐化
- registry 能显著降低后续接拼多多、抖音商城、小红书的成本

## 6. 本轮执行结论

这轮执行的核心不是新增一个功能，而是完成一次 `架构升级`：

- 从硬编码切到配置驱动
- 从分散实现切到 registry 管理
- 从单次命令切到可编排 daily pipeline

这会直接决定后面继续扩平台时的工程质量上限。

# hot-ec-news

Cross-platform ecommerce hot keyword pipeline focused on apparel, shoes, and jewelry.

## Scope

- Primary sources: Taobao/Tmall, JD
- Secondary validation sources: third-party platforms such as Chanmama and Feigua
- Runtime targets: macOS and Windows
- Output: daily markdown report plus digest-style WeCom/email push previews
- Report now includes trend comparison, new entries, repeated entries, validation highlights, confidence tiers, and a manual-review queue

## Quick Start

```bash
npm install
npm run init
npm run demo:fixtures
npm run collect:live
npm run report:validated
npm run run:daily
npx tsx src/cli/index.ts config:show
npm test
```

## Commands

- `npm run init`: initialize storage directories and SQLite database
- `npm run demo:fixtures`: run the fixture pipeline and generate a sample report
- `npm run collect:live`: collect live keywords from Taobao and JD suggestion endpoints
- `npx tsx src/cli/index.ts import:third-party --provider chanmama --file fixtures/third-party/chanmama-sample.csv`: import a third-party CSV export
- `npm run report:validated`: build a validated report from the latest collected date
- `npm run run:daily`: run live collection, auto-import files from `data/imports`, and generate a validated report
- `run:daily` now reports both `Imported files` and `Skipped files` for third-party CSVs
- `npx tsx src/cli/index.ts config:show`: inspect the resolved config after defaults + `config/app.json`
- `npm run push:report -- --channel wecom --dry-run`: preview a push payload
- `npm run schedule:generate -- --platform macos --time 09:00`: generate a scheduler file
- `npx tsx src/cli/index.ts schedule:install --platform macos --time 09:00`: install the scheduler on the matching OS
- `npx tsx src/cli/index.ts schedule:status --platform macos`: inspect scheduler status
- `npx tsx src/cli/index.ts schedule:remove --platform macos`: remove the installed scheduler
- `npm run status`: show the latest generated report
- `npm run status` now summarizes report, scheduler artifacts, enabled sources, push readiness, and the latest `run:daily` outcome
- `npx tsx src/cli/index.ts doctor`: run a production preflight for sources, push, paths, and scheduler
- `npm run check`: run typecheck and automated tests

## Configuration

- Copy [app.example.json](config/app.example.json) to `config/app.json`
- `reportDir` and `databasePath` are honored and may be relative to the project root or absolute paths
- `categories` controls both seed collection and report sections
- Enable or disable `sources`
- Enable `pushChannels`
- Set `autoPushOnDaily` to `true` if you want `run:daily` to generate push previews or real pushes automatically

## Project Docs

- [Design plan](docs/daily-hotwords-push-plan.md)
- [Development plan](docs/development-plan.md)
- [Product solution](docs/product-solution.md)
- [Technical solution](docs/technical-solution.md)
- [v1 report](docs/reports/v1.md)
- [v2 report](docs/reports/v2.md)
- [v3 report](docs/reports/v3.md)
- [v4 report](docs/reports/v4.md)
- [v5 report](docs/reports/v5.md)
- [v6 report](docs/reports/v6.md)
- [v7 report](docs/reports/v7.md)
- [v8 report](docs/reports/v8.md)
- [v9 report](docs/reports/v9.md)
- [v10 report](docs/reports/v10.md)
- [v11 report](docs/reports/v11.md)
- [v12 report](docs/reports/v12.md)
- [v13 report](docs/reports/v13.md)
- [v14 report](docs/reports/v14.md)
- [v15 report](docs/reports/v15.md)
- [Final acceptance](docs/acceptance/final-acceptance.md)

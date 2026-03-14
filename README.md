# hot-ec-news

Cross-platform ecommerce hot keyword pipeline focused on apparel, shoes, and jewelry.

## Scope

- Primary sources: Taobao/Tmall, JD
- Secondary validation sources: third-party platforms such as Chanmama and Feigua
- Runtime targets: macOS and Windows
- Output: daily markdown report, later webhook/email push

## Quick Start

```bash
npm install
npm run init
npm run demo:fixtures
npm run collect:live
npm run report:validated
npm test
```

## Commands

- `npm run init`: initialize storage directories and SQLite database
- `npm run demo:fixtures`: run the fixture pipeline and generate a sample report
- `npm run collect:live`: collect live keywords from Taobao and JD suggestion endpoints
- `npx tsx src/cli/index.ts import:third-party --provider chanmama --file fixtures/third-party/chanmama-sample.csv`: import a third-party CSV export
- `npm run report:validated`: build a validated report from the latest collected date
- `npm run status`: show the latest generated report
- `npm run check`: run typecheck and automated tests

## Project Docs

- [Design plan](docs/daily-hotwords-push-plan.md)
- [Development plan](docs/development-plan.md)
- [v1 report](docs/reports/v1.md)
- [v2 report](docs/reports/v2.md)
- [v3 report](docs/reports/v3.md)

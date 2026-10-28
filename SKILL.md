---
name: rednote-us-stock-sentiment-skill
description: "Collect a bounded 24-hour Rednote US-stock discussion sample using a logged-in OpenCLI browser, preserve raw evidence, analyze bullish/bearish posts, and render the fixed branded 4:3 report. Also use for rendering an existing report; ordinary stock-price lookup does not apply."
---

# Rednote美股舆情 / Rednote US-stock sentiment

Use the user's logged-in Rednote browser through OpenCLI 2.0.2. Default limits: 100 posts, 50 first-level comments per post, serial requests at least 3.5 seconds apart. This package is a sample collector, not a platform census or trading signal.

Original project material from v2.0.0 uses AGPL-3.0-only. Preserve the author/origin attribution in [ATTRIBUTION.md](ATTRIBUTION.md); when modifying/sharing this package or deploying a modified network service, read [references/LICENSE-POLICY.md](references/LICENSE-POLICY.md) for Corresponding Source obligations. Third-party terms and the historical v1.0.0 Apache grant remain separate.

## Choose the mode

- **Collect + analyze + report:** read [references/COLLECTION.md](references/COLLECTION.md), then run the staged scripts. Use one browser session; do not run an MCP collector or another CLI collector at the same time. Browser extension installation/permissions and login remain the user's actions.
- **Analyze existing raw:** verify `raw-freeze.json`, annotate the accepted post texts, then run `scripts/analyze.mjs`. No new browser requests are necessary.
- **Render existing report:** read the report schema in [references/SCHEMA.md](references/SCHEMA.md); run `node scripts/render.mjs --input <report.json> --output <output-prefix>`. No image-generation API is involved.

## Invariants

1. Save search rounds, post detail metadata and comment snapshots under the run's `raw/` before deriving summaries. Keep originals; comment repairs append revisions. Freeze SHA256 evidence before sentiment analysis.
2. Freeze the post-publication window after login/filter readiness. Admit only real public note publication timestamps, not ID-derived guesses or edit times. The window applies to post publication; comments are captured at collection time.
3. Treat login/captcha/rate-limit blocks as stops. If native comment paging needs a visible page, pause for the user to foreground the existing owned tab. Never bypass platform controls or silently switch accounts. Do not resume an unresolved failed run automatically.
4. Classify title/body into 看多, 看空, 中性, 多空混合, 无法判断. Historical gains/losses and emotional complaints alone do not prove future direction. Quote the actual evidence and record insufficient text as unknown; image/video content is not analyzed unless separately authorized and implemented.
5. Review `analysis/annotations.json` post by post, in manageable batches. Set `reviewed:true` only after reading the text. Each verified individual-stock mention needs canonical identity, `asset_type:"stock"`, direction and a verbatim evidence excerpt. Exclude ETFs/indices from the stock ranking; merge GOOG/GOOGL. The renderer computes its conclusion from counts; never hardcode a bullish result for new data.
6. The approved template is fixed 1600×1200, 4:3 landscape. Reuse `assets/report-template.svg` and `scripts/render.mjs`; replace data, not the layout. The largest numerals are actual posts and first-level comments; the donut center is the derived conclusion. Validate category sums and the real 12-bin timeline.
7. Every generated report must retain the bottom-right **original avatar + Douyin symbol + 抖音搜索：15682165 + 撸西西 | 教AI**. Use the bundled avatar bytes; do not regenerate the face. The renderer requires the brand assets and has no hide-brand option. This is the shipped product's output rule; it does not claim that AGPL attribution legally requires advertising on every fork's output.
8. Missing time/token/billing observations stay unknown. When requested, collect only this task's available usage metadata, distinguish cached input from new input, and keep reasoning tokens inside output totals. API-equivalent estimates and actual subscription extra charges are different fields. A shared account quota delta is not an exact per-task bill. Recheck official prices before using a dated pricing snapshot for a new estimate.

## Delivery and reuse

Deliver local raw/normalized data, annotations, the report JSON, and the PNG/SVG with its manifest. Never upload a private run, browser session, raw post/comment text or account usage records as an example when sharing code. The bundled preview is explicitly a demonstration; its billing numbers are synthetic.

Use [references/PROVENANCE.md](references/PROVENANCE.md) when explaining upstream reuse versus our modifications. Chinese and English user guides are [README.md](README.md) and [README.en.md](README.en.md).

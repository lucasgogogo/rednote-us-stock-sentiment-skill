# Rednote US-stock sentiment Skill

[中文](README.md) · [Schema](references/SCHEMA.md) · [Provenance](references/PROVENANCE.md)


Use your logged-in Rednote browser to collect a bounded 24-hour US-stock discussion sample, save raw evidence first, review title/body sentiment, and render a fixed **1600×1200, 4:3** report. Defaults: up to **100 posts** and **50 first-level comments per post**, serial operations.

The report includes actual exported counts, five sentiment categories, a data-derived conclusion, the top three stocks by distinct mentioning posts, and a two-hour publication-time line. The creator avatar, Douyin ID **15682165** and **撸西西 | 教AI** remain in the bottom-right corner. The preview's timing, usage and billing are explicitly illustrative.

![Fixed branded report — demo usage and billing](examples/preview.png)

### Download and install

1. [Download the complete v2.0.1 ZIP](https://github.com/lucasgogogo/rednote-us-stock-sentiment-skill/releases/download/v2.0.1/rednote-us-stock-sentiment-skill-v2.0.1.zip).
2. Extract the full folder into your agent's skill directory, such as `~/.codex/skills/rednote-us-stock-sentiment-skill`.
3. With Node.js ≥20.18.1, run `npm ci --ignore-scripts`, `npm run demo`, then `npm test` from that folder.
4. Install the official [OpenCLI extension](https://github.com/jackwener/OpenCLI), personally approve permissions, and log in to `rednote.com` in the selected browser.

### Ask your agent

```text
Use $rednote-us-stock-sentiment-skill to collect a 24-hour Rednote sample for 美股.
At most 100 posts and 50 primary comments per post, serially.
Preserve raw data before reviewing title/body sentiment and stock mentions.
Report actual counts and render the bundled fixed branded 4:3 layout.
Stop for login, captcha or rate/security restrictions. Do not run another MCP collector.
Keep missing timing/usage/billing unknown rather than fabricating zero.
```

Existing report data can be rendered with:

```bash
node scripts/render.mjs --input path/to/analysis/report.json --output output/report
```

The model in your agent performs text review; rendering needs no generative-image API. A full collection/analysis run produces raw snapshots, normalized posts, annotations and aggregate JSON. Rendering an existing report produces only PNG, SVG and a manifest. Share the PNG; opening the editable SVG separately requires the bundled fonts. No image OCR or video transcription is included. The sample is not a platform census, and its time line is not a stock-price chart.

### Reuse, license and verification

OpenCLI supplies browser/adapter primitives; resvg-js supplies SVG rendering. Our wrappers add time validation, accumulation/deduplication, serial caps, primary-comment paging, raw freezing, evidence-backed analysis, cost accounting and the fixed template. Fonts/icons retain their own notices. See the [full provenance matrix](references/PROVENANCE.md).

Original v2 material uses AGPL-3.0-only with reasonable origin attribution and applicable Corresponding Source obligations for distributed or modified network versions. The earlier v1.0.0 Apache grant remains valid. See [licensing policy](references/LICENSE-POLICY.md).

The project includes twelve offline tests; see [Actions](https://github.com/lucasgogogo/rednote-us-stock-sentiment-skill/actions) for the current version’s CI status. One predecessor live run was successful; the portable package has not been live-tested on every browser or fresh account. Private raw/session/account records are excluded from the release.

See [the staged collection and recovery guide](references/COLLECTION.md), [data and billing schema](references/SCHEMA.md), and [author-attribution notice](ATTRIBUTION.md) for the exact workflow. Missing measurements stay unknown; do not treat synthetic demo billing as real usage. The original code/template licensing boundary starts at v2.0.0; the earlier Apache grant for v1.0.0 remains valid.

# 数据Schema与口径 / Data schema and semantics

版本 / Version: `1.0`. JSON schemas: [post](../schema/post.schema.json), [annotation](../schema/annotation.schema.json), [report](../schema/report.schema.json). Arithmetic and evidence constraints are checked by the scripts in addition to the structural schemas.

## 运行目录 / Run layout

```text
run-config.json                 keyword, fixed UTC window, caps, browser routing
session.json                    local owned-tab routing; never publish
raw/search/*.json               each search harvest + diagnostics
raw/details/<note_id>.json      visible extraction + projected target public note
raw/comments/<note_id>.json     first comment result
raw/comments-structured/...     public comment state snapshots, page visibility/geometry
posts.jsonl                     append-only normalized original records
comment-updates.jsonl           optional append-only comment repair revisions
progress.json                  finished / stopped / incomplete status
posts-final.jsonl               originals + latest comment revisions
raw-freeze.json                 hashes of raw and source records
metrics.json                   optional observed task metrics, kept local
analysis/annotations.json       reviewed text evidence and stock identities
analysis/report.json            aggregate input to the fixed renderer
analysis/report.png/.svg        fixed branded output
analysis/report.manifest.json   aspect, mandatory brand, hashes
```

原始文件保留平台字段形状，没有把未经核实的字段硬改成标准数据。 / Raw preserves the observed response shape; normalized records keep the provenance rather than guessing missing fields.

## 帖子与留言 / Post and first-level comments

| 字段 / Field | 类型 / Type | 来源、定义 / Origin and meaning |
|---|---|---|
| `note_id`, `url` | string | 经Rednote域名/路径核验的搜索结果；ID只做去重，不能推算发布时间。 / Validated search link; ID used for identity, not timestamp inference. |
| `collected_at` | UTC ISO string | 本地采集时间，不是发布时间。 / Collection clock, not publication. |
| `title`, `body` | string | 当前目标帖公开note title/desc，必要时可见DOM提取。 / Target public note text, with visible extraction fallback. |
| `published_at` | UTC ISO or null | 公开`note.time`秒/毫秒值，或同目标帖明确的time datetime；不是`lastUpdateTime`。 / Real note.time or explicit target time element, never edit time. |
| `published_time_raw`, `published_time_source` | number/string/null | 保留原值与公开字段路径；冻结时与raw回算。 / Original value/path, revalidated against raw. |
| `within_24h` | boolean or null | 固定窗口含左右边界；null表示无法验证，不是false。 / Inclusive fixed window; null means unknown. |
| `detail_success`, `comments_success` | boolean | 分开记录详情/评论是否实际取得；失败不冒充零留言。 / Separate observation success flags. |
| `counts` | object | 平台可见互动数字，可能是含子回复的展示总数；不等于导出一级留言数。 / Display counters may include nested replies. |
| `comments` | array, ≤50 | 实际采到的一级留言；计数为数组长度。 / Actually exported primary comments. |
| `comments[].id` | string/null | 平台稳定评论ID，优先去重。 / Stable ID used for deduplication. |
| `comments[].text`, `time` | string, ISO/null | 内容和创建时间；时间缺失保持null。 / Comment text and observed creation time. |
| `comments[].is_reply` | false | 主动采集只纳入一级；raw中自带子回复另存但不计入。 / Only primary comments enter normalized count. |
| `comments_stop_reason`, `comments_has_more` | string, boolean/null | 达上限、一级EOF、停滞等真实终止原因。 / Cap, primary EOF, stall, and observed remaining state. |
| `image_urls`, `type` | array, string/null | 图片地址与视频标记，不代表已经OCR/转写。 / Media references do not imply content recognition. |

## 逐帖观点标注 / Per-post annotations

```json
{
  "note_id": "000000000000000000000001",
  "reviewed": true,
  "stance": "看多",
  "evidence": "原文中逐字存在的方向性短句",
  "reason": "必要时记录转述或期限",
  "stocks": [{
    "ticker": "MSFT", "name": "微软", "asset_type": "stock",
    "stance": "看多", "evidence": "含股票身份及方向的原文短句"
  }]
}
```

五类分别为看多/bullish、看空/bearish、中性/neutral、多空混合/mixed、无法判断/unknown。非unknown分类必须有原文证据；unknown必须说明理由。每篇恰好一条标注，`reviewed:false`脚手架不能进入统计。 / Exactly one reviewed annotation per accepted post. Non-unknown labels require verbatim source evidence; unknown requires a reason.

每只股票同帖只计一次；需确认是个股，不能把ETF/指数当个股。GOOG归一为GOOGL。股票方向与主帖方向分开。若股票只被提及、无方向证据，其股票立场填unknown。 / Deduplicate per post and canonical ticker, separate stock stance from the main post; name-only mentions are unknown for direction.

## 报告与模板输入 / Report input

| 字段 / Field | 约束 / Constraint |
|---|---|
| `schema_version` | 固定`1.0` / literal `1.0` |
| `demo` | 演示数据为true，成图显式标注 / visibly mark demo inputs |
| `source`, `keyword`, `timezone` | 实际来源、关键词、IANA时区 / actual source, keyword, IANA zone |
| `window_start_utc`, `window_end_utc` | 精确24小时固定窗口 / exactly 24 hours |
| `posts_in_window` | 0–100，成功且时间合格的去重帖数 / accepted unique posts |
| `primary_comments_exported` | 合格帖子实际留言数组合计，≤帖子数×上限 / exported primary arrays only |
| `stance_counts` | 五类非负整数，合计等于帖子数 / five counts sum to posts |
| `timeline` | 12个非负整数，每2小时按发帖时间分桶，合计等于帖子数 / 12 two-hour bins; sum to posts |
| `stock_ranking[]` | ticker/name/posts/post_stance_counts；股票五类合计等于该股票提及帖数 / stance total equals mentioning posts |
| `metrics` | null或下述实测对象；缺失不等于0 / optional observed metrics; absent ≠ zero |

中心结论按最大类别与已知多空帖数计算；信息不足占一半及以上时优先显示“信息不足/方向待判”。分母始终是本批帖子，不将仅有方向的子样本比例伪装成总体。 / The center is computed from category counts and directional comparisons. If at least half is unknown, show insufficient information. Never mislabel a directional-only denominator as the full sample.

## 时间、token、费用 / Time, tokens and costs

```json
{
  "elapsed_seconds": 1200,
  "usage": {"input_tokens":1100000,"cached_input_tokens":1000000,"cache_write_input_tokens":0,"output_tokens":10000},
  "billing": {"plan":"Codex订阅账号","extra_usd":0,"source":"task-scoped billing observation identifier"},
  "quota": {"before":20,"after":21,"same_window":true,"source":"account-wide snapshots"}
}
```

上面数值为演示。`input_tokens`已含缓存读取和缓存写入；新输入为三者相减。`output_tokens`已含推理输出，不能另加reasoning。总token是input+output。每次发送的重复上下文也计入；这不等于生成了同等量新文字。 / These numbers are illustrative. Input includes cache reads/writes; reasoning is inside output. Repeated context counts toward usage, not new generated text.

公式 / Formula: `(new_input×input_rate + cache_read×cache_rate + cache_write×write_rate + output×output_rate) / 1,000,000`。价格来自`assets/pricing.json`中有日期的官方快照；缓存写入快照为5分钟费率。不同模型tokenizer/缓存率可能不同，这是等量折算，不是Claude实付账单。

`elapsed_seconds`需说明起止边界，默认包含本次调试、等待、采集和分析，不包含早期工具调研或制图。实际费用0必须有依据；订阅月费不能算成本轮新增扣费。额度只有同一计费窗口才相减，并标“同期账户”而非单任务精确消耗。 / State elapsed-time boundaries, verify zero extra charges, keep subscription fees separate, and compare only the same quota window. Account deltas are shared, not precise task attribution.

## 品牌字段 / Branding

品牌不是报告JSON的可变字段。渲染器从随包固定资源读取头像与品牌配置，并强制输出。 / Branding is not caller-controlled report data; the renderer inserts the bundled fixed identity assets. Missing mandatory assets cause a failure rather than an unbranded report.

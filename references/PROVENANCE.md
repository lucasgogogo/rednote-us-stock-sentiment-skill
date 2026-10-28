# 来源、复用和改动 / Provenance, reuse and modifications

维护者 / Maintainer: [lucasgogogo](https://github.com/lucasgogogo). 初版 / Initial release: 2026-10-28.

v2.0.0起本项目原创代码/模板改为AGPL-3.0-only，并保留[作者来源通知](../ATTRIBUTION.md)；v1.0.0历史Apache授权继续有效。这里列出的上游许可保持原样，不随本项目新许可被替换。 / Original code/template from v2.0.0 uses AGPL-3.0-only with retained author attribution. The v1.0.0 Apache grant and all listed upstream licenses remain valid. See [policy](LICENSE-POLICY.md).

## 开源项目对照 / Open-source matrix

| 项目 / Project | 版本、许可 / Version, license | 复用范围 / Reused | 我们的处理 / Our changes |
|---|---|---|---|
| [jackwener/OpenCLI](https://github.com/jackwener/OpenCLI) | npm `@jackwener/opencli` 2.0.2, Apache-2.0 | `BrowserBridge`; `buildScrollHarvestJs`; `NOTE_EXTRACT_JS`; comment normalizer/count parser and extraction helpers | 上游安装包不修改；在本包wrapper中调用，搜索生成的JS仅将固定等待增加为3500ms并检测上游标记漂移。 / Installed upstream files remain unchanged. Wrappers call its functions; generated search JS is adapted only for slower waits, with a drift guard. |
| [thx/resvg-js](https://github.com/thx/resvg-js) | `@resvg/resvg-js` 2.6.2, MPL-2.0 | SVG→PNG native renderer | 依赖调用，没有复制或改写其引擎源码。 / Used as an unmodified dependency, not a reimplemented renderer. |
| [Google Fonts Noto Sans SC](https://github.com/google/fonts/tree/main/ofl/notosanssc) | OFL-1.1, downloaded 2026-10-28; original hash in source manifest | 中文及Latin字形 / CJK and Latin glyphs | 将可变字体实例化为400/700静态字重，改名Luxixi Report Sans，保留OFL及版权；避免系统字体/可变字体选择漂移。 / Instantiate 400/700 static weights, rename to Luxixi Report Sans, retain OFL/copyright. |
| [fontTools](https://github.com/fonttools/fonttools) | 4.60.1, MIT; authoring only | `instantiateVariableFont` | 仅用于构建随包静态字体；运行报告不需要它。 / Used only by the reproducible font-build helper, not at runtime. |
| [Simple Icons](https://github.com/simple-icons/simple-icons) | CC0-1.0; TikTok glyph snapshot/hash in manifest | 音符SVG轮廓 / Music-note SVG geometry | 同一路径叠加青/红偏移和黑色前景作为抖音搜索标识；原始与变换后hash分别记录，商标权没有转移。 / Repeat the same path in cyan/red offsets and black foreground; source and transformed hashes are recorded separately, with no transfer of trademark rights. |

OpenCLI imports use internal file paths because the needed helpers are not all public package exports. The version check and lockfile are deliberate. Do not upgrade without checking these exact exports. `npm ci --ignore-scripts` preserves the tarball adapters and avoids installation-time hooks.

## 本包逐文件归属 / File-level ownership

| 文件 / Files | 来源与工作 / Origin and work |
|---|---|
| `scripts/upstream.mjs` | 原创依赖桥接；加载未修改的OpenCLI导出，严格检查2.0.2。 / Original dependency loader with strict version check. |
| `scripts/collect.mjs` | 从本次研究中我们编写并实测的CLI wrapper便携化：去除机器路径，参数化run/100篇/50留言，保留累计滚动、固定时间窗、原始详情保存与安全停止。 / Portable adaptation of our tested research wrapper; no third-party skill copied. |
| `scripts/data-utils.mjs` | 我们新增时间转换、当前目标帖公开数据投影、搜索去重、页面阻塞识别；不导出整站state或登录信息。 / Original time conversion, target-note projection, dedup and page-block guards. |
| `scripts/public-comments.mjs`, `repair-comments.mjs` | 我们新增当前帖公开评论状态快照、稳定ID去重、可见页原生滚轮、真实滚动祖先选择、EOF/停滞判断和追加修订；计数解析复用OpenCLI。 / Original public-comment snapshots, dedup, visible native wheel paging, scroll-owner/EOF/stall handling and append-only repairs; count parsing comes from OpenCLI. |
| `scripts/init-run.mjs`, `lease.mjs` | 我们新增独占采集锁及便携运行初始化；锁冲突停止，不并发采集。 / Original portable initialization and exclusive collector lease. |
| `scripts/freeze.mjs`, `analyze.mjs`, `cost.mjs` | 我们新增raw哈希/冻结、逐帖证据校验、多空与个股聚合、费用分项折算。公开版分析接受明确的逐帖股票标注，取代研究版的固定别名正则匹配。 / Original freezing, evidence checks, stance/stock aggregation and cost accounting; explicit reviewed stock annotations replace the research script's fixed alias regex. |
| `assets/report-template.svg`, `scripts/render.mjs` | 我们依据用户定稿品牌图编写的固定坐标模板；早期imagegen只用于设计预览，生产渲染不调用它，不重新生成布局。 / Original fixed-coordinate implementation of the approved design; imagegen was used only for design previews, never for runtime rendering. |
| `schema/`, `SKILL.md`, `agents/`, `references/`, `tests/` | 我们新增机器schema、中英文说明、行为规则与离线回归。 / Original schemas, bilingual docs, workflow and offline regression. |

## 品牌与其他素材 / Brand and other assets

- `assets/brand/luxixi-avatar.jpg`：创作者既有公开头像原件，用户明确授权放入本模板与公开包；不通过AI重画。名称“撸西西 | 教AI”、抖音号15682165由用户现有品牌资料核对，并在本聊天确认。 / Creator-provided original avatar and confirmed public identity. No AI redraw.
- `assets/logos/GOOGL.png`：[Google官方G图标](https://www.google.com/images/branding/googleg/1x/googleg_standard_color_128dp.png)，文件来源和SHA256在素材清单。 / Official Google G asset with source/hash recorded.
- `assets/logos/MSFT.svg`、`SKHY.svg`：我们用几何和文字绘制的识别性示意，不是公司授权背书，也不声称商标原创。 / Our geometric/typographic identification drawings, not endorsed official artwork.
- 公司标志、平台标志和头像不随软件AGPL许可重新授权；保留各自的商标、肖像及版权归属。品牌头像随本分发包用于原样署名展示。 / Marks and identity assets are not relicensed as AGPL software; their original rights remain. The creator avatar is bundled for unchanged attribution display in this distribution.

## 未包含的项目与测试边界 / Exclusions and verification boundary

先前研究过MCP和Agent Reach，但本公开包没有复制其代码，不要求运行它们，不应将它们列为本包的实际采集依赖。 / MCP alternatives and Agent Reach were research context, not shipped code/runtime dependencies.

真实raw、帖子正文/作者ID/留言、浏览器session、账号额度/费用记录不进入仓库。示例账单为合成夹具；帖子总量/比例用于复现已确认设计，不是新采集结果。 / Private run data and account records are excluded. Demo billing is synthetic; sample quantities reproduce the approved design and do not claim a new collection.

旧适配的一次真实平台成功与本包离线测试分别报告；不将打包测试说成新账号平台测试。 / The predecessor's one live run and the portable package's offline tests are different evidence.

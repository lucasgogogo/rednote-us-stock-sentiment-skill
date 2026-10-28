# 采集、分析与恢复 / Collection, analysis and resume

## 前提 / Prerequisites

Node.js≥20.18.1、锁定依赖、官方OpenCLI扩展、用户本人已登录rednote.com。选择实际登录浏览器的context ID，不新开另一个账号会话。 / Install the pinned dependencies and official extension, log in personally, and select the context of that browser.

本流程只串行运行CLI。操作前停止其他采集器，特别是MCP；临时全局锁拒绝本包多进程并发，但无法控制别的软件。 / Stop other collectors, including MCP. Our local lease excludes competing instances of this package; it cannot control unrelated software.

以下命令由agent在skill目录执行。`<run>`是用户指定或本次新建的本地运行目录；`<context>`来自现有OpenCLI浏览器选择/doctor信息，不是登录凭据。 / Run these from the skill directory; placeholders represent a local run directory and the existing browser context ID.

```bash
npx --no-install opencli doctor
node scripts/init-run.mjs --run <run> --context-id <context> --keyword 美股 --max-posts 100 --max-comments 50 --timezone America/Winnipeg
node scripts/collect.mjs open-filter --run <run>
node scripts/collect.mjs filters --run <run>
node scripts/collect.mjs search --run <run>
node scripts/collect.mjs collect --run <run>
node scripts/repair-comments.mjs --run <run>
node scripts/collect.mjs close --run <run>
node scripts/freeze.mjs --run <run>
node scripts/analyze.mjs --run <run>
```

每条命令完成并检查状态后再执行下一条，不能并发。`analyze`第一次只创建待审标注脚手架并停止；阅读raw对应的标题正文后填写标注，再运行： / Execute sequentially and inspect each result. The first analysis call creates an unreviewed annotation scaffold and stops. Review the source text before running:

```bash
node scripts/analyze.mjs --run <run>
node scripts/render.mjs --input <run>/analysis/report.json --output <run>/analysis/report
```

仅在用户明确要求费用时，另填`<run>/metrics.json`，来源与范围见SCHEMA。收集结束后再冻结；冻结后不修改raw。 / Populate optional task metrics only from actual observations. Freeze after collection, never mutate frozen raw.

## 失败与恢复 / Failure and resume

- 登录/验证码/风控：立即停止平台请求，用户处理登录或限制后才按其指示继续。程序不换账号、不提取Cookie、不绕过验证。 / Stop on login/security blocks and wait for legitimate resolution.
- 初始化连接失败、只有run-config而没有session：解决扩展连通问题后重新执行同一init命令，沿用原session身份；已有采集证据的目录禁止重新初始化。 / A failed initial connection can be retried with the same init command and session identity; a started data run cannot be reinitialized.
- `STOP_VISIBILITY`或`NEEDS_VISIBLE_PAGE`：请用户把本次拥有的采集页切到前台并展开；确认后续跑`collect`，再串行`repair-comments`，失败评论会进入补读目标。 / Foreground the owned tab, resume the existing run, then repair comments serially.
- 搜索多卡片却容器高度0、位置重叠：保留诊断；确属本次拥有的标签页时，使用`replace-collapsed`替换该页，再`open-filter`、`filters`、`search-continue`。旧selection与raw不覆盖，不把异常布局当搜索到底。 / Retain diagnostics; replace only the owned collapsed tab, reapply filters, and continue accumulated search.
- 三次连续普通详情失败：停止，不重复整轮。先查对应官方资料和原始错误；不要靠重试凑满100。 / Stop after three consecutive ordinary failures; investigate before any retry.
- 搜索返回不足100或部分无法核实时间：按实际入选量报告，不用旧帖填补。 / Report the actual eligible sample, never pad with old posts.
- 采集锁冲突：保留锁，检查锁中PID及是否存在其他采集；正常退出会释放自身锁。异常终止后的锁不自动清理；只在确认原进程停止且用户授权恢复时清理该明确锁文件。 / An unresolved lease is not automatically broken; confirm the prior process stopped before authorized recovery.

`collect`会跳过已有帖子，评论补读追加`comment-updates.jsonl`。`freeze`选择最后修订合并为`posts-final.jsonl`并记录SHA256，`analyze`每次复验。 / Post collection resumes by ID; comment repairs append revisions; freezing merges the last revision and analysis rechecks hashes.

## 文字标注 / Text annotations

按照[SCHEMA](SCHEMA.md)给每篇合格帖子一个标注，不能只填热门股票帖。引用机构预测时注明转述，不推断作者实盘持仓；同帖不同股票可有不同方向。股票身份不明确先查官方公司/交易所来源，无法确认时不纳入个股榜。 / Review every eligible post, attribute quoted forecasts, allow per-stock directions, and verify uncertain security identities with official sources.

## Sources / Pre-Action Check

动作 / Actions: local scripts plus authenticated read-only browser navigation/scrolling on rednote.com. Official references checked: [OpenCLI](https://github.com/jackwener/OpenCLI), [browser bridge guide](https://github.com/jackwener/OpenCLI/blob/main/docs/guide/browser-bridge.md), and pinned package source files listed in PROVENANCE. Failure modes: extension disconnect, DOM changes, hidden page, missing time, account restrictions. Fallback: pause and diagnose local raw; no bypass or concurrent engine.

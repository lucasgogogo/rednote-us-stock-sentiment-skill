# Rednote美股舆情 Skill

[English](README.en.md) · [复用与改动 / Provenance](references/PROVENANCE.md) · [数据 Schema](references/SCHEMA.md)

通过已登录的 Rednote 浏览器，串行采集最近24小时的美股关键词讨论，先存 raw，再做文字观点分析，最后输出固定 **4:3** 报告。默认最多100篇帖子、每篇50条一级留言。

![固定4:3模板，演示数据](examples/preview.png)

模板重点依次是：**实际帖子数、实际一级留言数、多空结论**。环形图中心由数据计算；保留发帖时间折线和讨论最多的三只股票。右下角固定保留原头像、抖音图标、**抖音搜索：15682165**、**撸西西 | 教AI**，程序没有隐藏品牌的参数。

## 安装与使用

需要 Node.js ≥20.18.1。把完整仓库放进你的 agent 技能目录，例如 `~/.codex/skills/rednote-us-stock-sentiment-skill`，然后在该目录安装锁定依赖：

```bash
npm ci --ignore-scripts
npm run demo
npm test
```

`--ignore-scripts`避免安装阶段启动OpenCLI后台服务或下载更新适配器；实际采集时才连接浏览器。普通渲染只依赖随包字体和SVG渲染器，不调用图像生成模型。

向 agent 提出：

> 使用 $rednote-us-stock-sentiment-skill，抓一次最近24小时的美股讨论，最多100篇、每篇50条一级留言，先保存raw，再分析多空和热门股票，使用固定品牌模板出图。

首次采集需安装官方 [OpenCLI 浏览器扩展](https://github.com/jackwener/OpenCLI)，由本人确认权限并登录 `rednote.com`。本包不代替账号登录，不读取或导出Cookie。浏览器调用步骤、暂停与恢复见 [采集指南](references/COLLECTION.md)。

已有报告只需：

```bash
node scripts/render.mjs --input examples/report.json --output output/report
```

输出 `report.png`、`report.svg` 和 `report.manifest.json`。同一运行环境、版本、字体和输入重复渲染，PNG/SVG字节一致。固定字体已经随包提供，渲染不需要安装Python或系统字体；对外分享使用PNG，SVG源码另行打开时需使用随包字体。

## 统计与费用口径

- 帖子窗口按真实发帖时间核定；留言为采集时可见的一级留言，不要求留言时间也在同一个24小时内。
- 只分析标题与正文。正文不足、图片和视频里未读取的观点保留“无法判断”，不能当成中性。
- 热门股票按去重提及帖子数排序，同帖同股票只计一次；ETF/指数不进入个股榜，GOOG/GOOGL合并。同帖数按代码排序。
- 折线是本次样本在每2小时的发帖量分布，不能冒充全平台新增量、历史情绪或股价走势。
- Token用量和实际额外付费没有记录时显示“未记录/未知”。示例中的20分钟、111万token、$1.75和订阅额度均为演示，不是真实采集账单。
- API折算使用有日期和官方来源的价格快照；当前示例是Claude Fable 5.1标准费率。订阅月费与本次额外付费分开，不能把订阅账号一律写成免费。

## 用了谁的，自己做了什么

本包不是从零实现浏览器引擎。**OpenCLI 2.0.2**提供浏览器桥接、搜索滚动构建器、详情提取和评论工具函数；上游包保持原样。我们增加24小时真实时间筛选、虚拟列表累计去重、受限串行采集、原生评论分页补读、raw追加/冻结、带证据的多空分析、数据schema、费用核算和固定品牌模板。详细逐文件对照、版本、许可证和测试边界见 [中英文来源说明](references/PROVENANCE.md)。

主要依赖：OpenCLI（Apache-2.0）、resvg-js（MPL-2.0）、Noto字体（OFL-1.1）、Simple Icons图标（CC0）。字体构建使用fontTools；它不是运行时依赖。我们的代码采用Apache-2.0；字体、第三方标志及创作者头像按各自声明处理，不能把公司商标说成我们的原创。

## 已验证与限制

原始采集适配曾在Rednote海外站、OpenCLI 2.0.2、扩展1.0.26及Ego Lite上完成100篇/583条一级留言的单次采集。本次公开包只做离线回归和模板验证，没有为了打包再次访问账号。便携打包版本尚未在全新账号或所有操作系统上做平台实测。

`npm test`检查时间边界、去重和上限、一级评论EOF/可见性、raw篡改、标注证据、费用计算、固定品牌、4:3尺寸和重复渲染一致。平台页面或OpenCLI内部导出改变后需要重新验证，不能把历史成功当作永久可用。

## Sources / Pre-Action Check

上面的命令在本地安装依赖、运行合成测试和渲染演示；不会登录或采集平台。依据为本仓库`package.json`、`scripts/`，以及已核对的 [OpenCLI](https://github.com/jackwener/OpenCLI)、[resvg-js](https://github.com/thx/resvg-js)。首次浏览器权限/登录由用户处理；遇到扩展不连通、登录/风控或不可见评论页时暂停，不绕过限制。版本来源和文件哈希见`assets/source-manifest.json`、字体构建清单和`package-lock.json`。

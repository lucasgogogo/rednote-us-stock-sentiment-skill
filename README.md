# Rednote美股舆情 Skill

[English](README.en.md) · [数据Schema](references/SCHEMA.md) · [来源与改动](references/PROVENANCE.md)

想知道最近24小时，小红书海外版上讨论美股的人更偏看多还是看空？这个skill让你的AI在已登录的Rednote浏览器里搜索，先保存原始数据，再逐帖分析，最后生成同一套4:3报告。

**默认最多100篇帖子，每篇最多50条一级留言。**这是关键词样本分析，不是平台全量普查。

**[下载完整skill包（v2.0.1 ZIP）](https://github.com/lucasgogogo/rednote-us-stock-sentiment-skill/releases/download/v2.0.1/rednote-us-stock-sentiment-skill-v2.0.1.zip)** · [中文完整说明](README.md) · [English guide](README.en.md)

## 最后能得到什么

![固定4:3报告模板：图中费用与额度是演示值](examples/preview.png)

1. **实际抓到多少篇帖子、多少条一级留言。**没有读到的部分不冒充已经拿全。
2. **看多、看空、中性、多空混合、无法判断各多少篇。**圆环中心按当前数据计算结论，不会每次都写“偏多”。
3. **讨论最多的三只股票。**按提及该股票的去重帖数排名，并列出各自的文字方向。
4. **样本发帖时间折线。**按真实发布时间每2小时归档，展示这批样本的分布。
5. **原始数据和分析依据。**保留搜索、帖子详情、留言快照、逐帖判断及原文依据，方便回查。
6. **固定4:3图片。**1600×1200，位置、字体和颜色固定；右下角保留原头像、抖音号15682165和“撸西西 | 教AI”。

有真实记录时，还能填写耗时、token和API等量费用估算；实际订阅额外付费单独显示。没有记录就显示未知。**上图的20分钟、111万token、$1.75及额度变化是演示数据，不是本次采集账单。**

## 安装：先让AI把环境准备好

需要Node.js ≥20.18.1、一个支持读取本地skill的AI客户端，以及官方OpenCLI浏览器扩展。分析使用你当前AI客户端的模型；渲染不调用图像生成API。

**1、下载上方完整ZIP。**解压后保留整个`rednote-us-stock-sentiment-skill`目录，包括scripts、assets和references。

**2、放进skill目录。**Codex常用位置是`~/.codex/skills/rednote-us-stock-sentiment-skill`。

**3、在这个目录安装锁定依赖并试出一张演示图：**

```bash
npm ci --ignore-scripts
npm run demo
npm test
```

也可以直接把仓库地址交给Codex：

```text
请把这个仓库安装成可用的skill：
https://github.com/lucasgogogo/rednote-us-stock-sentiment-skill

先检查Node版本、安装锁定依赖，并生成本地演示图。
暂时不要访问Rednote，不要发送任何内容。
浏览器扩展和权限需要我本人确认时，再告诉我具体操作。
```

**4、本人安装官方[OpenCLI扩展](https://github.com/jackwener/OpenCLI)，确认权限，并在对应浏览器登录`rednote.com`。**程序不代替你登录，也不读取或导出Cookie。原适配曾在Ego Lite上完成一次真实采集；这个便携包没有对所有浏览器、新账号做平台实测。

## 第一次怎么用

安装完成、浏览器登录后，直接对AI说：

```text
使用 $rednote-us-stock-sentiment-skill，采集Rednote最近24小时的“美股”讨论。
最多100篇帖子，每篇最多50条一级留言，串行执行。

先保存raw，再根据标题和正文逐帖判断看多、看空、中性、多空混合或无法判断。
给出实际帖子数、留言数和讨论最多的三只股票。
用随包固定4:3模板出图，保留右下角logo、抖音号和名字。

遇到登录、验证码或频率限制就停止，不绕过，不同时启动MCP。
费用没有真实记录时写未知，不要编成0美元。
```

只想用已有数据重新出图：

```bash
node scripts/render.mjs --input examples/report.json --output output/report
```

真实报告把`examples/report.json`换成对应的`analysis/report.json`。输出PNG、SVG和校验清单；分享图片使用PNG。SVG另行打开需使用随包字体。

## 原始数据保存在哪里

每次运行选择自己的本地run目录，主要产物为：

| 文件 | 内容 |
|---|---|
| `raw/` | 搜索、详情、留言的原始观察记录 |
| `posts-final.jsonl` | 去重帖子与最后一次留言修订 |
| `raw-freeze.json` | 原始资料SHA256清单 |
| `analysis/annotations.json` | 逐帖立场、股票身份和原文依据 |
| `analysis/report.json` | 汇总及固定模板输入 |
| `analysis/report.png` | 固定品牌4:3报告 |

详细字段、留言统计、时间窗和费用口径见[中英文schema说明](references/SCHEMA.md)。

## 读结果时要看清的几件事

- 只分析标题与正文，不默认识别图片或转写视频；文字不足保留“无法判断”。
- 留言数是实际导出的一级留言数，不等于平台完整评论区总数；留言可能写于发帖窗口之外。
- 股票热度按去重帖数，不按涨跌幅；ETF和指数不混入个股榜，GOOG/GOOGL合并。
- 折线是样本发帖时间分布，不能当成股价或全站情绪走势。
- 登录、风控、隐藏页面或加载故障会影响采集量。没有足够合格帖子时就报告实际数量，不拿旧帖凑100。

## 用了哪些开源项目，我们加了什么

**OpenCLI 2.0.2**提供浏览器桥接、搜索滚动构建器、详情提取和评论工具函数；**resvg-js 2.6.2**负责SVG转PNG。Noto字体和Simple Icons图形也保留原许可。

我们新增或整理了：真实发帖时间校验、搜索累计去重、串行上限、可见页一级评论补读、追加修订、raw冻结、带原文依据的多空分析、费用口径，以及固定品牌模板。

[逐文件来源、版本、许可证与改动对照（中英文）](references/PROVENANCE.md)

## 授权与版本

本版原创代码和模板采用**AGPL-3.0-only**：保留合理作者/来源通知；对外分发修改版或用修改版提供网络服务时，按许可提供完整对应源码，包括受许可覆盖的新增和改动。私人自用不因修改就必须公开。v1.0.0已经发布的Apache授权继续有效，第三方保留各自许可。

[授权规则](references/LICENSE-POLICY.md) · [来源署名通知](ATTRIBUTION.md)

项目提供12项离线测试，当前版本的CI状态可在[Actions](https://github.com/lucasgogogo/rednote-us-stock-sentiment-skill/actions)查看。打包没有再次抓取账号；真实raw、登录信息和账户记录没有放进公开包。

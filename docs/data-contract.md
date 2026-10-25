# 固定契约（第三方依赖的部分）

本文件列出 **一旦变更就会打断外部消费方** 的内容。修改前先读这里；改完后同步更新本文件与 `DATA_SCHEMA`。

依据：<https://github.com/TCOTC/siyuan-bazaar-stats/issues/1>（第三方图表服务依赖 `/data/` 产物与 `data/snapshots/`）。

标记约定：

- **冻结** —— 改动等于破坏兼容，必须走新路径或升 `schema`。
- **半冻结** —— 名称/位置固定，内容随上游变化（可改值，不可改字段名或含义）。
- **自由** —— 可随时改。

---

## 1. 入口地址

| 地址 | 说明 | 状态 |
| --- | --- | --- |
| `https://siyuan-bazaar-stats.mytemos.com/data/summary.json` | 主站全量摘要 | 冻结 |
| `https://siyuan-bazaar-stats.mytemos.com/data/packages/<name>.json` | 单包详情，`<name>` 须 `encodeURIComponent` | 冻结 |
| `https://github.mytemos.com/siyuan-bazaar-stats/data/summary.json` | GitHub Pages 镜像，前缀 `/siyuan-bazaar-stats/` | 冻结 |
| `https://github.com/TCOTC/siyuan-bazaar-stats/tree/main/data/snapshots` | 原始快照，上游不可用时的回退源 | 冻结 |
| 站点路由 `/` 与 `/p/:name` | 站内页面，外链可能已被分享 | 半冻结 |

`/data/` 前缀由 `public/data` 目录与 `fetch(`${import.meta.env.BASE_URL}data/...`)` 共同决定，同时被两个部署目标使用：

- Cloudflare Pages：`VITE_BASE=/` → `/data/...`
- GitHub Pages：`VITE_BASE=/siyuan-bazaar-stats/` → `/siyuan-bazaar-stats/data/...`

改 `base` 会同时改动这两套路径。

---

## 2. 快照 `data/snapshots/YYYY-MM.jsonl`

一行一个 JSON 对象，追加写，不重写历史行。

| 字段 | 类型 | 含义 | 状态 |
| --- | --- | --- | --- |
| `t` | 整数 | Unix **秒**，取自集市 `meta.publishedAt`，**不是采集时刻** | 冻结 |
| `g` | 字符串 | 集市 `meta.generation`，用于同秒去重排序 | 冻结 |
| `full` | `true` 或缺失 | 存在即「清空后重建」，缺失为增量合并 | 冻结 |
| `p` | 对象 | `{包名: {d, x?}}` | 冻结 |
| `p[].d` | 整数 | 累计下载量 | 冻结 |
| `p[].x` | 5 元整数数组或缺失 | 评分分布，**下标 0 = 1 星 … 下标 4 = 5 星** | 冻结 |

文件名 `YYYY-MM.jsonl` 的月份取自 `t` 的 **UTC**。

三条必须保留的语义（下游据此判断「没有数据」还是「没有变化」）：

1. **无变化不写行** —— 某包在某次快照中没有条目，表示数值未变，不是缺失观测。
2. **不写删除点** —— 包从集市消失时保留最后统计，不会出现「删除」记录。因此快照里可能有当前索引中已不存在的包。
3. **`full` 每天至多一次** —— 由 `shouldWriteFullSnapshot` 按 UTC 日判定：当天第一个发生变化的快照为全量，其余为增量。上游整天无变化时**当天没有 `full`**。

`a` / `c`（评分均分、评分人数）**永不写入快照**，只由 `x` 推导。下游读到 `a`/`c` 应当视为无效数据。

---

## 3. `/data/summary.json`

顶层：`schema`、`updatedAt`、`publishedAt`、`generation`、`totals`、`packages`。

| 字段 | 含义 | 状态 |
| --- | --- | --- |
| `schema` | 格式版本，当前 `1`（`src/lib/types.ts` 的 `DATA_SCHEMA`） | 冻结 |
| `updatedAt` | 构建时刻（Unix 秒），索引获取失败时为 `publishedAt` | 半冻结 |
| `publishedAt` | 集市 `meta.publishedAt` | 半冻结 |
| `generation` | 集市 `meta.generation` | 半冻结 |
| `totals.packages` | 包数量 | 半冻结 |
| `totals.rated` | 有评分的包数 | 半冻结 |
| `totals.ratings` | 评分条数总和 | 半冻结 |
| `totals.downloads` | 下载量总和 | 半冻结 |

`packages[]` 字段：

| 字段 | 含义 | 状态 |
| --- | --- | --- |
| `name` | 集市包名，唯一键 | 冻结 |
| `type` | `plugins` / `themes` / `widgets` / `icons` / `templates` | 冻结 |
| `repo` | `owner/repo`，恒取自集市索引 | 冻结 |
| `author` | 作者，HTML 实体已反转义（仅此一处，`catalog` 内保留原始文本） | 半冻结 |
| `displayName` | 展示名，已反转义 | 半冻结 |
| `description` | 描述，已反转义 | 半冻结 |
| `iconURL` | 图标地址，**含版本 hash，每次发版都会变** | 自由 |
| `downloads` | 当前累计下载量 | 冻结 |
| `rating` | 可选，见下 | 冻结 |
| `downloadDelta24h` | 与 24 小时前基线的差 | 冻结 |
| `ratingCountDelta24h` | 与 24 小时前基线的评分人数差 | 冻结 |
| `sparklineDownloads` | 下载量抽稀序列 | 冻结 |
| `sparklineAverage` | 均分抽稀序列，仅含有评分的历史点 | 冻结 |
| `updatedAt` | 集市包更新时刻（Unix 秒），未知为 `0` | 半冻结 |

`rating` 为 `{ average, count, distribution }`，且必须满足：

```
count   = Σ distribution[i]
average = Σ (i + 1) · distribution[i] / count
```

不满足（差值 > 1e-9）或 `distribution` 非 5 个非负整数时，该包**整个 `rating` 字段消失**（不是置零）。

固定语义：

- **排序**：`updatedAt` 降序 → `downloads` 降序；`updatedAt` 为 `0` 的排在最后（两者都为 `0` 时只按 `downloads` 降序）。下游不应假设顺序稳定，索引更新会重排。
- **24 小时基线**：取 `t ≤ publishedAt − 86400` 的最后一个历史点；不存在则取 `history[0]`；仍不存在则增量为 `0`。
- **sparkline 抽稀**：历史点数 ≤ 48 时原样输出全部点；否则取 48 个等距下标（含首尾，四舍五入，**允许重复值**）。当前历史长度远小于 48，抽稀尚未生效。
- **`type` 与 `repo` 的来源**：`type` 只能来自 catalog（`stage/<type>.json`），catalog 获取失败时该键**整个缺失**；`repo` 优先取集市索引，索引不可用时退回 catalog。

---

## 4. `/data/packages/<name>.json`

顶层：`schema`、`name`、`type`、`repo`、`author`、`displayName`、`description`、`iconURL?`、`updatedAt`、`current`、`history`。

- `current`：`{ d, a?, c?, x? }`
- `history`：`[{ t, d, a?, c?, x? }]`，按 `t` 升序；`t` 与 `d` 必有，评分三字段仅在有评分时出现。

**`history` 是「变化点序列」，不是等间隔采样。**缺失区间表示数值未变，绘图需按真实 `t` 连线，并用「沿用上一值」的方式跨过空档，不能假设相邻点等距。

**文件存在性**：`packages/` 目录每次构建被整目录删除后重建，所以产物**只包含当前集市索引中的包**。包下架后详情文件消失，请求返回 `404`（实测 Cloudflare Pages 返回 `text/html`，不是 JSON）。

快照按设计不写删除点，已下架的包会以最后一次统计的形式留在 `data/snapshots/` 里（历史需要它们），但 **不会进入 `/data/` 产物**。

**索引不可用时不发布产物** —— `build-data` 直接以非零码退出，工作流报红并由 GitHub 通知维护者。站点保持上一次成功部署的版本，不会出现「把已下架包当真在架包」的数据。

包名可能含空格与 `+`（如 `Cliff Dark`、`Dark+`），拼接 URL 必须 `encodeURIComponent`；实测 `Dark%2B.json` → `200`。

---

## 5. 上游输入契约

| 输入 | 固定要求 |
| --- | --- |
| `https://bazaar.b3logfile.com/bazaar/index.json?t=<5分钟桶>` | `meta.schema` **必须为 `2`**，否则 `collect` 直接抛错、不写快照；`meta.generation` 非空字符串；`meta.publishedAt` 正整数；`meta.ratingsAvailable` 布尔（**仅校验，当前未参与逻辑**） |
| 索引中的 `repo` | 必须匹配 `owner/repo`（恰好一个 `/`，字符限 `[A-Za-z0-9._-]`），否则该包被整条丢弃 |
| 索引中的包名 | 必须通过 `isValidPackageName`（长度 1–255、不含 `<>"'&:/\\|?*`、不含控制字符、不以 `.` 开头、不含 `..`、非 Windows 保留名），否则丢弃 |
| `https://siyuan-sync.b3logfile.com/apis/siyuan/version?ver=3.8.0` | 返回 `.bazaar` 需匹配 `[a-f0-9]{7,40}` |
| `https://oss.b3logfile.com/bazaar@<hash>/stage/<type>.json` | 提供 `repos[].url`（`owner/repo@hash`）、`repos[].updated`（可 `Date.parse` 的字符串）、`repos[].package.{name,author,displayName,description}` |
| `https://oss.b3logfile.com/package/<owner/repo>@<hash>/icon.png` | 图标地址由 `repoHash` 拼出，**hash 随发版变化** |

固定行为：

- 三类元数据的 `displayName` / `description` 是 locale 映射，选取顺序固定为 `zh_CN` → `zh-CN` → `zh_Hans` → `default` → 第一个非空值，之后反转义 HTML 实体。**因此产物只有单语言文本，不含 locale 映射表。**
- 索引请求带的 `?t=<300 秒桶>` 是绕开上游 CDN 的固定手法，不可去掉。

---

## 6. 构建与工作流

| 项 | 固定内容 |
| --- | --- |
| 采集频率 | `.github/workflows/collect-deploy.yml` 的 `cron: '*/30 * * * *'`；GitHub 可能延迟数小时 |
| 快照提交 | bot 账号 `github-actions[bot]`，提交信息 `chore: snapshot bazaar stats`，`git add data` |
| 触发条件 | `push` 到 `main`（`paths-ignore: data/**`）、每 30 分钟、手动 |
| 并发 | `group: collect-deploy`，`cancel-in-progress: false` |
| 部署目标 | 同一份 `dist` 分别以 `VITE_BASE=/siyuan-bazaar-stats/`（Pages）与 `VITE_BASE=/`（Cloudflare）构建两次 |
| Cloudflare 项目名 | `siyuan-bazaar-stats`；自定义域 `siyuan-bazaar-stats.mytemos.com` |
| 需要的 Secret | `CLOUDFLARE_API_TOKEN`、`CLOUDFLARE_ACCOUNT_ID` |
| CI 门禁 | `pnpm test`、`pnpm typecheck` 与 `pnpm build-data` 必须通过，任一失败即中断部署 |
| 失败通知 | 任一步骤失败 → job 报红 → GitHub 按仓库通知设置给维护者发邮件 |
| 索引请求次数 | **每次工作流只请求一次**：`collect` 拉到索引后写入 `.cache/bazaar-index.json`，`build-data` 直接复用（有效期 15 分钟），避免两步跨过 5 分钟桶后拿到不同版本 |
| SPA 回退 | 构建时把 `dist/index.html` 复制为 `dist/404.html`（`vite.config.ts` 的 `spaFallback`）；`public/_redirects` 为 `/* /index.html 200` |

`summary.json` 与每个 `packages/*.json` 都是单行 JSON（`JSON.stringify` 后加换行），无缩进 —— 依赖 diff 或流式读取的下游按此假设。

---

## 7. 已知弱点（尚未修复，改动前请评估）

1. **`type` 依赖 catalog** —— 集市索引不带类型，只有 `stage/<type>.json` 带。catalog 获取失败时 `type` 键整片缺失，下游会拿到 `undefined`。
2. **无 `schema` 的读取方** —— 虽然产物现在带 `schema: 1`，但代码**没有任何版本校验或迁移逻辑**；升版时旧产物与旧读者会静默不兼容。
3. **`rating` 会整条消失** —— 上游 `average` 与 `distribution` 不一致超过 `1e-9` 时，该包评分被丢弃，看起来像「评分被清空」。这是刻意的保守处理：宁可无评分也不给错评分。
4. **未使用的上游字段** —— `meta.ratingsAvailable` 被校验但未参与逻辑，`ratingsAvailable: false` 时不会特别处理。

---

## 8. 可以自由改动

站点 UI / 样式 / 组件 / Highcharts 版本、文案、`displayName` 等**字段值**、`iconURL` 的具体地址、包数量与顺序、采集粒度（在不破坏 §2 语义前提下）、`public/` 下的静态资源、`pnpm` 脚本、依赖版本、部署触发时间。

Highcharts 按个人非商业许可使用，**不可**随代码 MIT 一并再许可（见根目录 `LICENSE`）。

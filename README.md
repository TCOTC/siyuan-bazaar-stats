# 思源集市统计

跟踪 [思源笔记](https://github.com/siyuan-note/siyuan) 集市包的**评分**和**下载量**历史。官方索引只保存当前计数，本仓库每 30 分钟公开快照一次。

- 站点：<https://siyuan-bazaar-stats.mytemos.com>
- GitHub Pages：<https://github.mytemos.com/siyuan-bazaar-stats/>
- 数据源：<https://bazaar.b3logfile.com/bazaar/index.json>
- 背景：[siyuan#16711](https://github.com/siyuan-note/siyuan/issues/16711)

详情页趋势图使用 [Highcharts](https://www.highcharts.com/)，按个人非商业许可。若要商用部署，请自行取得 Highcharts 许可。视觉气质参考 [netaba.re](https://netaba.re/ui) 的开源界面谱系（[markni/netabare](https://github.com/markni/netabare)，MIT）。

## 数据

- `data/snapshots/*.jsonl`：GitHub 仓库中公开的原始快照，每次集市 `publishedAt` 变化即追加一行；每月首行含 `"full": true`，为该月全量。
- `/data/summary.json`、`/data/packages/*.json`：构建产物（不在仓库中，由 `pnpm build-data` 生成并随站点发布），包含当前数值、重建的历史曲线与最近 48 点 sparkline。
- 历史由快照增量重建，快照缺失的区间为沿用值而非真实观测；请以各点的时间戳 `t`（Unix 秒）为准，不要假设采样间隔均匀。
- `/data/summary.json` 已包含全部包的当前数值与 sparkline，通常不必逐包拉取详情文件。

## 许可

- **代码**（`src/`、`scripts/`、构建配置）：[MIT](LICENSE)。不覆盖下文的数据、第三方内容与 Highcharts。
- **统计数据**（`data/snapshots/` 的时间序列，以及站点 `/data/` 下发布的 JSON）：[CC BY 4.0](data/LICENSE)。包括数值字段与包信息字段（`displayName`、`description`、`author`、`iconURL` 等）。可读取、转载、再发布与商用，需署名并链接本仓库、注明是否修改、不得暗示本项目为你的服务或产品背书。
- **上游资源**：`bazaar.b3logfile.com`、`oss.b3logfile.com`、`siyuan-sync.b3logfile.com` 上由平台提供的文件与图标，权利归其提供方。
- 本项目与思源笔记官方及思源集市无隶属关系，未获其背书；数据按「现状」提供，不保证完整、准确或及时。

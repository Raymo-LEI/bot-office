# Cut2 调研：官方 bot 名单 / 状态 / 头像接口

日期：2026-11-06（Asia/Tokyo）  
范围：仅官方或已授权途径；不爬 cookie、不用未公开内部 HTTP、不碰凭证。

## 结论（一句话）

**没有**可供 Pixel Office（浏览器静态站）轮询的官方「真实 bot 工作状态 / 头像」HTTP/MCP 接口。  
名单与外观目前只能：手工/配置维护，或将来接官方接口；状态继续 mock，形状按真实预留。

## 已探查的官方工具（证据）

| 途径 | 能读什么 | 不能读什么 | 证据 |
|------|----------|------------|------|
| `SearchTeamBots` | Team Bots 的 id/名称/描述/是否已添加 | 个人助手花名册、在线/工作状态、头像图 | cursor `SearchTeamBots` schema：自然语言搜团队 bot |
| `CreateAgent` / `UpdateAgent` | 创建/改自己侧档案字段 | 批量读他人状态 | schema 为写档案 |
| `UpdateAvatar` | **设置/清除本 bot 自己的头像** | 读取任意 bot 头像 URL 供前端 | schema：`set`/`clear` + 本地 path |
| `SendToAgent` | 给另一 agent 发消息 | 状态查询 | 消息投递，非状态 API |
| `CheckSubagent` | 本 bot 用 Task 派出的子代理进度 | 队友 bot 是否在干活 | 仅限自己的 Task 子代理 |
| Prompt `<teammates>` | 本轮注入的队友 id/短描述 | 稳定轮询 API、头像、工作态 | 运行时上下文，不是站点可 fetch 的端点 |
| 插件市场检索 | 无「Grok Bot roster/status/avatar」官方连接器 | — | SearchPlugins 无匹配产品连接器 |

## 本地 box 附带观察（非产品官方 API，不写入「已接真源」）

同用户共享 box 上存在 `/home/box/agent-data/agents/<id>/profile.json`，常见字段：`name`、`description`、`title`、`avatarShape`、`avatarColor`。  
少数 agent 的 `assets/` 下有自定义 png。Office 线（Head/PM/Pixel Dev 等）当前多为空 `avatarShape`/`avatarColor`，无自定义头像图。

**判定**：这是机内配置文件，不是文档化的对外接口；通宵**不**把该路径当成 live 真源接到站点（避免未公开内部依赖与隐私/路径耦合）。可作将来「官方导出」对照，不作本刀交付依赖。

## 字段能力对照（产品目标）

| 目标字段 | 官方可轮询？ | 本刀做法 |
|----------|--------------|----------|
| bot 名单 | 否（站点侧） | `data/org.json` seats 配置 |
| 工作 / 不工作 | 否 | `data/status.mock.json`；`STATUS_URL` 留 live 插槽 |
| 头像/外观图 | 否 | 通用像素小人；`avatarUrl` / `avatarShape` / `avatarColor` 插槽 |
| Team Bot 目录 | 部分（agent 工具，非浏览器） | 不接入本站 |

## 对实现的指令

1. 保持二元位置：工作=桌前 / 不工作=休息区。  
2. 人物默认通用像素风；schema 预留外观字段，读不到则忽略。  
3. 早上 rollup：本文件路径 +「未按真实头像出图」。

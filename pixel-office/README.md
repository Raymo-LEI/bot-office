# Pixel Office · Cut 1.1（像素合楼）

浏览器里的一栋楼：3F Heads、2F PMs、1F Workers。平面、立面和座位都读 `data/org.json`。人画在哪里由状态文件决定，画面上只有两种位置。

## 本地打开

在仓库根目录：

```bash
cd pixel-office && python3 -m http.server 8765
```

浏览器打开 http://127.0.0.1:8765/ 。需要 HTTP；`file://` 无法 fetch JSON。按钮或键盘 1 / 2 / 3 切换楼层。

## 两种位置

| 状态值 | 画面 |
| --- | --- |
| `busy` 或 `working` | 人画在自己的电脑工位上 |
| `idle`、`not-working`、`unknown`、缺记录或其他值 | 人画在本层休息区 |

界面不显示第三种状态徽章。内部的 `unknown` 一律当成未在工作。`vacant: true` 的座位是待招，不画人。立面上的 ■ / ◌ 只表示这个座位有没有人，不表示此刻在不在工位。

默认文件：`data/status.mock.json`。键是 `org.json` 里座位的 `id`。当前 mock 让 3F 同时看到两种位置：Office Head 在工位，Optics Head（`idle`）和 Painting Head（`unknown`）都在休息区。

## 从 mock 换到实时接口

以后接真接口时，返回同一形状即可（多出来的字段会被忽略）：

```json
{ "source": "live", "seats": { "3f-office-head": "busy" } }
```

用查询参数指向它。相对路径相对 `pixel-office/`，也可以写完整的 http(s) 地址：

```text
http://127.0.0.1:8765/?status=data/status.live.json
http://127.0.0.1:8765/?status=https://your-host/office/status.json
```

不带参数则继续读 mock。接口失败时，本层有人的座位都改画到休息区，并在页面上说明状态源不可用。

## 改组织

编辑 `data/org.json`：

1. 在 `groups` 加 `{"id":"g-lens","name":"镜头组"}`
2. 给相关 seat 加可选 `"groupId":"g-lens"`
3. 新座位要有稳定 `id`（用职责，不用个人身份），并在状态文件里给这个 id 一个值

新部门：往 `departments` 加 `{id,name,color}`，seat 用该 id 即可。平面几何在 `layout`（`core` / `corridor` / `lobby` / `rooms` / `deskSlots` / `restArea`）。

`restArea` 用 `roomId` 指向 `rooms` 里 `kind: "rest"` 的那间，并给出 `slots`（平面坐标，按本层未在工作的座位顺序落人）。休息区占走廊南侧东端，外框与原来的会议/茶水间相同。

布局原则：每层同构——左侧芯筒、贯通走廊、门厅靠芯筒，工位区按部门成房间分布于走廊两侧。座位按部门顺序依次落到该部门 deskSlots。渲染读配置，不写死部门。

## 参考图

`evidence/` 是 Cut 1.1 的楼层平面参考（`floor-1f.png`、`floor-2f.png`、`floor-3f.png`），记录休息区改标之前的楼层几何。

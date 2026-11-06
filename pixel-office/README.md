# Pixel Office · Cut1（像素合楼）

## 本地打开
```
cd pixel-office && python3 -m http.server 8765
```
浏览器打开 http://127.0.0.1:8765/ （需 http，file:// 无法 fetch）。按钮或键盘 1/2/3 切换楼层。

## 加项目组
编辑 `data/org.json`：
1. 在 `groups` 加 `{"id":"g-lens","name":"镜头组"}`
2. 给相关 seat 加可选 `"groupId":"g-lens"`
新部门：往 `departments` 加 `{id,name,color}`，seat 用该 id 即可；平面几何在 `layout`（core/corridor/lobby/rooms/deskSlots/rest/restSlots）。

布局原则：每层同构对齐——左侧芯筒、贯通走廊、门厅靠芯筒，工位区按部门成房间分布于走廊两侧；座位按部门顺序依次落到该部门 deskSlots。渲染全部读配置，无写死部门。

## Status layer（二元：工作 / 不工作）
- Schema：`data/status.schema.json` — `{ "records": [ { seatKey, working, source, updatedAt } ] }`；也接受 `state: "working"|"away"`
- Mock：`data/status.mock.json`；`seatKey` = `floor|department|title`
- 加载：`js/status.js` → `window.StatusAPI`（`STATUS_URL`、`loadStatus`、`seatKey`、`isWorking`）

### 位置切换（不是色点）
- **工作**（`working: true` / `state: "working"`）→ 人物 token 画在**工位**
- **不工作**（`working: false` / `state: "away"` / 缺记录）→ 人物 token 画在 **layout.rest + restSlots**
- **待招 vacant** → 空桌，不画人

### mock → live
改 `js/status.js` 的 `STATUS_URL` 指向 live 端点（同一 StatusFile 形状），或替换 `data/status.mock.json`。

## 外观（侧边栏形状头）

就座角色的 token 主体对齐 App 侧边栏小人：CSS/SVG **形状掩膜** + `avatarColor` 填色 + 两颗浅白胶囊眼。可带很小的身体/腿，用来辨认坐在工位还是站在休息区。默认不再使用桃色方块头。

可选字段可写在 `data/org.json` 的 seat 上，或 `data/status*.json` 的 StatusRecord 上；**status 记录值优先于 seat 值**，空字段忽略。

- `avatarUrl`（string|null）：有图用图（按 `avatarShape` 做掩膜）。这批座位无图。
- `avatarShape`：`wedge`（丸角右指三角 / 播放键）| `teardrop`（水滴）| `hex`（六边形）| `blob`（圆）| `cloud`（云朵 / 多瓣）| `round`（同 blob）| `square`。缺省 `blob`。
- `avatarColor`：形状填色；缺省用部门色。

当前就座外形写在 `org.json` seats（待招不填、不扩座）：

| title | floor | avatarShape | avatarColor |
| --- | --- | --- | --- |
| Office Head | 3F | wedge | `#10B8A0` |
| Optics Head | 3F | cloud | `#F86810` |
| Painting Head | 3F | teardrop | `#F09010` |
| Office PM | 2F | teardrop | `#10B8A0` |
| Optics PM | 2F | blob | `#F09010` |
| Painting PM | 2F | blob | `#F82838` |
| Ins Sampler | 1F | hex | `#A06838` |

目前没有官方 live 头像源；`avatarUrl` 仍是占位插槽。`assets/avatar-demo.png` 仅作有图回退示例，mock 不再覆盖上述外形。

不工作（人在休息区）时，原工位名牌变灰、虚线框并标「(离席)」，桌椅保留；名字标签跟人走。

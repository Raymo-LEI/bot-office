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

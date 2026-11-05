# Cut2 早上 · 用户醒后一步清单（GitHub）

当前远程是 **Cursor Origin 草稿**（Cloud Agent `new_repo`），不是 github.com。

## A. 推荐：把 Origin 草稿 publish 成正式仓
1. 打开 Cloud Agent：https://cursor.com/agents/bc-2a787825-190a-53fd-ba2b-90d9f1312a08
2. 在 Agent 页点 **Create repo / Publish**（或让 Office PM 调 `publish_repository`）
3. 仓库名建议：`bot-office`；可见性选 **PRIVATE**（或团队 INTERNAL）
4. Publish 后得到 `https://cursor.com/codebase/<owner>/bot-office`

## B. 若必须要 github.com/Raymo-LEI/bot-office
1. 用户在 GitHub 新建空仓 `Raymo-LEI/bot-office`（private）
2. 授权 Cursor 对该仓的 access（若提示）
3. 再让 Cloud Agent / PM 把内容推进该仓（或 Origin mirror outbound——以当时工具能力为准）
4. 验收：`git clone https://github.com/Raymo-LEI/bot-office.git` 后 `cd pixel-office && python3 -m http.server 8765`

## 已自决（通宵）
- 产品名 Bot Office；路径 `pixel-office/` + `cut0/`
- 空桌槽不处理
- 状态层先 mock，接口形状按真实设计

## 状态口径（睡前锁定）
- UI 仅：工作（桌前）/ 不工作（休息区）
- 平面需休息区；角色位置切换；unknown 内部并入不工作

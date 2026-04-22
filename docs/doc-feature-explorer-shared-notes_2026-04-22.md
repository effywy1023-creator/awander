# 功能说明 — 探险家共览

> 项目：gentle-lore v2 | 提出人：Effy | 记录日期：2026-04-22

---

## 一、功能目标

玩家在某关卡提交挖宝笔记后，再次进入该关卡时，可以查看其他玩家在同一关卡的挖宝内容，增强共同探索的仪式感。

---

## 二、入口 / 触发条件

- 玩家已在该关卡提交过**至少一条**挖宝笔记
- 满足条件后，**下次进入**该关卡时，详情页自动出现「其他探险家的发现」区块
- 本次访问中刚提交笔记，不会立即显示，需退出后再进入才触发——此设计是为了鼓励玩家回来重做、再看
- 未提交过笔记的玩家进入关卡时，不显示该区块

---

## 三、页面 / 功能结构

在 `LevelDetail.tsx` 现有写作区块下方新增区块，布局如下：

```
[ 航向导引 ]            ← 现有
[ 写作 / 历史记录 ]     ← 现有
[ 其他探险家的发现 ]    ← 新增，仅在已提交后显示
```

### 区块内容

- 区块标题：「其他探险家的发现」（样式沿用现有区块标题规范：text-xs font-medium text-muted-foreground uppercase tracking-wide）
- 默认显示最新 **3 条**，超出部分显示「加载更多」按钮
- 每条笔记卡片显示：
  - 脱敏别名（见第四节）
  - 笔记内容
  - 提交时间（相对时间，如「3 天前」）
- 不显示当前登录用户自己的笔记
- 按 `created_at` 倒序排列（最新在前）

---

## 四、别名规则

所有其他玩家统一显示为「匿名玩家」，不暴露任何姓名信息。无需查询 `users` 表的 `display_name`。

---

## 五、数据来源与查询逻辑

**不需要改动数据库**，复用现有 `treasure_notes` 和 `users` 表。

```typescript
// 第一步：判断当前用户是否已提交过笔记
const { data: myNotes } = await supabase
  .from('treasure_notes')
  .select('id')
  .eq('level_id', levelId)
  .eq('user_id', currentUserId)
  .limit(1)

const hasSubmitted = (myNotes?.length ?? 0) > 0

// 第二步：若已提交，查询其他玩家的笔记（不需要 join users 表）
const { data: otherNotes } = await supabase
  .from('treasure_notes')
  .select('id, content, created_at')
  .eq('level_id', levelId)
  .neq('user_id', currentUserId)
  .order('created_at', { ascending: false })
  .limit(3)

// 第三步：别名统一显示「匿名玩家」，直接渲染
```

**加载更多：**
```typescript
// 记录当前已加载数量，点击「加载更多」时追加查询
.range(offset, offset + 2)
```

---

## 六、路由

无新路由，在现有 `/level/:id` 页面内新增区块。

---

## 七、验收标准

- [ ] 未提交过笔记时，关卡详情页不显示「其他探险家的发现」区块
- [ ] 提交笔记后（包括历史已提交），区块正常显示
- [ ] 区块不显示当前用户自己的笔记
- [ ] 所有其他玩家显示为「匿名玩家」，不显示任何真实姓名
- [ ] 默认最多显示 3 条，超出时出现「加载更多」按钮
- [ ] 点击「加载更多」追加显示下一批，不刷新页面
- [ ] 按时间倒序排列（最新在前）
- [ ] 该关卡暂无其他玩家笔记时，显示空状态文字（如「还没有其他探险家到过这里」）
- [ ] 样式沿用现有古旧羊皮纸色系，笔记卡片使用 bg-accent/10，内容文字 text-muted-foreground italic

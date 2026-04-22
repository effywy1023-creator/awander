> 已废弃，见 doc-feature-body-notes-tab_2026-04-21.md

# 功能说明 — 我的宝箱

> 项目：gentle-lore v2 | 提出人：Effy | 记录日期：2026-04-21
> 适用范围：全平台所有产品

---

## 一、功能目标

为玩家提供个人探索数据的汇总视图，展示挖宝时间、笔记条数、以及按身体部位分类的探索记录。同时为后期「点亮身体地图」视觉效果提供数据基础。

---

## 二、入口

地图页右上角（或固定位置）一个小盒子图标，点击跳转「我的宝箱」页面。

---

## 三、页面结构

```
顶部统计
├── 挖宝时间：X 分钟
└── 探索笔记：X 条

身体部位列表（全部10个）
├── 探索过的 → 绿点，显示笔记条数，可点击
└── 未探索的 → 灰点，显示 0 条笔记，不可点击
```

---

## 四、顶部统计数据

| 数据 | 来源 | 说明 |
|------|------|------|
| 挖宝时间 | `user_progress.total_sec` | SUM / 60 取整，单位分钟 |
| 探索笔记 | `treasure_notes` | COUNT，当前用户所有笔记条数 |

---

## 五、身体部位列表

- 固定显示全部10个身体部位（来自 `tags_asset_level` where `category = 'body_part'`）
- 每个部位显示该用户在该部位下的笔记条数
- 笔记条数 > 0 → 绿点，可点击，弹出 modal
- 笔记条数 = 0 → 灰点，不可点击

**数据查询：**
```typescript
// 查询该用户所有笔记的 body_part 标签分布
const { data: notes } = await supabase
  .from('treasure_notes')
  .select('tags')
  .eq('user_id', userId)

// 统计每个 body_part 出现的次数
const bodyPartCount: Record<string, number> = {}
notes?.forEach(note => {
  note.tags?.forEach(tag => {
    bodyPartCount[tag] = (bodyPartCount[tag] ?? 0) + 1
  })
})
```

---

## 六、身体部位 Modal

点击某个身体部位后弹出底部抽屉，显示两个区块：

**做过的关卡**
- 该用户在该身体部位相关关卡中有写作记录的关卡列表
- 每个关卡可点击跳转进入该关卡

**我的笔记**
- 该用户在该身体部位下写过的所有笔记内容
- 按时间倒序排列

**数据查询：**
```typescript
// 查询该部位相关的笔记（含 level_id）
const { data: notes } = await supabase
  .from('treasure_notes')
  .select('content, level_id, created_at, levels(name)')
  .eq('user_id', userId)
  .contains('tags', [selectedBodyPart])
  .order('created_at', { ascending: false })

// 去重关卡列表
const levels = [...new Map(notes?.map(n => [n.level_id, n.levels])).values()]
```

---

## 七、路由

```
/treasure-box   → 我的宝箱页面
```

路由保护：未登录跳转 `/login`。

---

## 八、验收标准

**页面加载**
- [ ] 顶部正确显示当前用户的挖宝时间（分钟）和探索笔记条数
- [ ] 全部10个身体部位显示在列表中，顺序与 `tags_asset_level` 的 `sort_order` 一致

**身体部位列表**
- [ ] 有笔记的部位显示绿点，显示正确的笔记条数，可点击
- [ ] 0条笔记的部位显示灰点，显示「0 条笔记」，不可点击
- [ ] 笔记条数与 `treasure_notes` 实际数据一致

**Modal**
- [ ] 点击有笔记的部位，弹出底部 modal
- [ ] Modal 内「做过的关卡」列表正确显示该部位相关的关卡，无重复
- [ ] 点击关卡名称可跳转至对应关卡页面
- [ ] Modal 内「我的笔记」按时间倒序显示该部位下的所有笔记内容
- [ ] 点击关闭按钮可关闭 modal

**入口**
- [ ] 地图页有小盒子图标入口，点击跳转 `/treasure-box`
- [ ] 未登录直接访问 `/treasure-box` 跳转至 `/login`

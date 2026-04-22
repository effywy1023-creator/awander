# 功能说明 — 笔记页新增「身体坐标」Tab

> 项目：gentle-lore v2 | 提出人：Effy | 记录日期：2026-04-21
> 取代旧版 doc-feature-treasure-box_2026-04-21.md（已废弃，原方案为独立页面，现改为整合进现有笔记页）

---

## 一、功能目标

在现有笔记页（Notes）新增第三个 tab「身体坐标」，让玩家可以按身体部位浏览自己的挖宝笔记，与现有「时间轴」「关卡」两个 tab 并列。

---

## 二、页面结构

**文件：** `src/pages/Notes.tsx`（或对应的笔记页文件）

```
[ 时间轴 ] [ 关卡 ] [ 身体坐标 ]  ← 新增第三个 tab

身体坐标 tab 内容：
- 全部10个身体部位列表
- 有笔记的部位 → 显示笔记条数，可点击，弹出 modal
- 0条笔记的部位 → 显示「0 条笔记」，不可点击
```

---

## 三、身体部位列表

- 从 `tags_asset_level` 取 `category = 'body_part'` 的全部标签，按 `sort_order` 排序
- 统计当前用户每个身体部位的笔记条数

```typescript
// 查询该用户所有笔记的 tags
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

## 四、身体部位 Modal

点击某个有笔记的身体部位，弹出底部 modal，显示两个区块：

**探索之旅**
- 该用户在该身体部位下有写作记录的关卡列表
- 按产品分组显示（如「古老大陆」「内在地图」）
- 每个关卡可点击跳转进入

**藏宝标记点**
- 该用户在该身体部位下写过的所有笔记内容
- 按时间倒序排列
- 不显示原始 tag 数据

```typescript
// 查询该部位相关的笔记（含关卡和产品信息）
const { data: notes } = await supabase
  .from('treasure_notes')
  .select('content, level_id, created_at, levels(name, product_id, products(name))')
  .eq('user_id', userId)
  .contains('tags', [selectedBodyPart])
  .order('created_at', { ascending: false })

// 按产品分组关卡，去重
const levelsByProduct: Record<string, { productName: string, levels: Level[] }> = {}
notes?.forEach(note => {
  const productName = note.levels?.products?.name ?? '未知产品'
  if (!levelsByProduct[productName]) {
    levelsByProduct[productName] = { productName, levels: [] }
  }
  const alreadyAdded = levelsByProduct[productName].levels.find(l => l.id === note.level_id)
  if (!alreadyAdded) {
    levelsByProduct[productName].levels.push({ id: note.level_id, name: note.levels?.name })
  }
})
```

---

## 五、文案规范

| 位置 | 文案 |
|------|------|
| Tab 名称 | 身体坐标 |
| Modal 区块一标题 | 探索之旅 |
| Modal 区块二标题 | 藏宝标记点 |
| 笔记卡片 | 只显示笔记内容和时间，不显示 tag 原始数据 |

---

## 六、验收标准

**身体坐标 Tab**
- [ ] 笔记页顶部显示三个 tab：时间轴、关卡、身体坐标
- [ ] 身体坐标 tab 显示全部10个身体部位，按 sort_order 排序
- [ ] 有笔记的部位显示正确笔记条数，可点击
- [ ] 0条笔记的部位显示「0 条笔记」，不可点击

**Modal**
- [ ] 点击有笔记的部位弹出底部 modal
- [ ] Modal 标题为该身体部位名称
- [ ] 「探索之旅」区块按产品分组显示关卡，无重复
- [ ] 点击关卡名称可跳转至对应关卡页面
- [ ] 「藏宝标记点」区块按时间倒序显示笔记内容
- [ ] 笔记卡片不显示任何 tag 原始数据
- [ ] 点击关闭按钮可关闭 modal

---

## 七、不需要改动的内容

- 「时间轴」和「关卡」两个现有 tab 的逻辑和样式
- 其他任何现有页面

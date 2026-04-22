# 功能说明 — 素材身体部位分类

> 项目：gentle-lore v2 | 提出人：Effy | 记录日期：2026-04-20
> 更新：2026-04-21（音频支持多标签，笔记支持多标签）
> 适用范围：全平台所有产品

---

## 一、功能目标

为音频素材和玩家笔记打上身体部位标签，为后期「点亮身体部位」视觉效果做数据基础。关卡继承其音频素材的标签，不单独维护。

---

## 二、标签分类体系

标签统一存在 `tags_asset_level` 表，通过 `category` 字段区分类型，后续新增分类直接插入新记录即可。

### 标签表结构

```sql
CREATE TABLE tags_asset_level (
  id text PRIMARY KEY,
  category text NOT NULL,
  label_zh text,
  sort_order int
);
```

### 初始数据

**body_part — 身体部位**

| id | label_zh |
|----|----------|
| `head` | 头部 |
| `spine` | 脊柱 |
| `chest` | 胸腔 |
| `abdomen` | 腹部 |
| `upper_limb` | 上肢 |
| `lower_limb` | 下肢 |
| `pelvis` | 骨盆 |
| `shoulder` | 肩部 |
| `breath` | 呼吸 |
| `eye` | 眼部 |

**difficulty — 难度**

| id | label_zh |
|----|----------|
| `basic` | 基础 |
| `challenge` | 挑战 |

**body_position — 身体位置**

| id | label_zh |
|----|----------|
| `prone` | 俯卧 |
| `supine` | 仰卧 |
| `side_lying` | 侧卧 |
| `supported` | 支撑 |
| `sitting` | 坐姿 |
| `standing` | 站姿 |
| `rolling` | 翻滚 |

---

## 三、数据库变更

**标签主表：**
```sql
CREATE TABLE tags_asset_level (
  id text PRIMARY KEY,
  category text NOT NULL,
  label_zh text,
  sort_order int
);
```

**音频素材**，支持多标签（存 tag id 数组）：
```sql
ALTER TABLE assets
ADD COLUMN tags text[] DEFAULT '{}';
```

**玩家笔记**，支持多标签：
```sql
ALTER TABLE treasure_notes
ADD COLUMN tags text[] DEFAULT '{}';
```

关卡不单独存标签，需要时通过 `audio_ids` 关联查询继承素材的标签。

---

## 四、关卡继承逻辑

**音频素材**的标签包含全部三个 category（`body_part`、`difficulty`、`body_position`）。

**笔记继承时只取 `body_part` 类型**，`difficulty` 和 `body_position` 是音频属性，不继承到笔记。

```typescript
// 查询关卡所有音频的标签
const { data: assets } = await supabase
  .from('assets')
  .select('tags')
  .in('id', level.audio_ids)

const allTags = [...new Set(assets.flatMap(a => a.tags ?? []))]

// 从 tags_asset_level 过滤出 body_part 类型
const { data: bodyPartTags } = await supabase
  .from('tags_asset_level')
  .select('id')
  .eq('category', 'body_part')
  .in('id', allTags)

const inheritedNoteTags = bodyPartTags?.map(t => t.id) ?? []
```

---

## 五、笔记标签规则

- **默认继承**所在关卡音频素材的 `body_part` 标签
- `difficulty` 和 `body_position` 不继承到笔记
- 用户可**手动修改**，支持多选
- 存储为 tag id 数组，如 `["chest", "spine"]`

**交互时机：** 写作提交时或提交后，展示 `body_part` 类型的标签供用户选择，默认预选继承的标签，用户可调整。

---

## 六、后续依赖此功能的需求（挂起）

- **点亮身体地图** — 玩家完成某关卡后，对应身体部位在视觉地图上被点亮，累积探索自己的完整身体地图
- 具体视觉实现方式待定

---

## 七、管理员操作

新增/更新素材时带上 `tags` 字段：

```sql
-- 新增素材
INSERT INTO assets (id, type, name, content_url, tags)
VALUES ('V001', 'audio', '音频名称', 'url', '{"chest", "basic", "supine"}');

-- 更新已有素材标签
UPDATE assets SET tags = '{"spine", "challenge", "prone"}' WHERE id = 'V001';

-- 新增标签
INSERT INTO tags_asset_level (id, category, label_zh, sort_order)
VALUES ('new_tag', 'body_part', '新部位', 11);
```

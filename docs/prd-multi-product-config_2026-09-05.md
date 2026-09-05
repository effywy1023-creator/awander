# PRD — 多产品支持：文案分层、列表视图、笔记产品标识、统计口径

> 项目：gentle-lore v2 | 提出人：Effy | 日期：2026-09-05
> 状态：待开发

---

## 一、功能目标

平台已有三个产品（身体藏宝图、A new land、觉察游乐园），但界面文案和视图逻辑仍是按单产品设计的。新产品「觉察游乐园」上线后暴露三个问题：

1. 界面文案全局共享，进入觉察游乐园仍显示「身体藏宝图」等藏宝图世界观措辞
2. 觉察游乐园所有关卡默认解锁、互不依赖，地图视图的路径感不适用
3. 管理员笔记页混合显示多个产品的笔记，无法分辨来源
4. 学员端笔记页（`/notes`）跨产品混排，每条笔记看不出所属产品
5. 地图页的探索统计是跨产品全局累计，与地图本身按产品渲染不一致

本次解决以上五点，让平台真正支持多产品并存。

> 已有两名学员（TU005 萍萍、TU004 鑫鑫子）拥有双产品权限，问题 4、5 已实际发生。

**核心约束：身体藏宝图有 18 名真实学员在用，本次改动后他们看到的界面必须完全不变。**

---

## 二、入口 / 触发条件

| 改动 | 入口 | 可见条件 |
|------|------|----------|
| 文案分层 | 全平台各页面 | 所有用户，按当前产品自动切换 |
| 列表视图 | 地图页 | 仅 `觉察游乐园` 产品下生效 |
| 笔记产品标识（管理员） | `/admin/notes` | 仅管理员 |
| 笔记产品标识（学员） | `/notes` | 所有用户 |
| 探索统计按产品 | 地图页 | 所有用户 |

**相关 ID：**

| 对象 | uuid |
|------|------|
| 产品 觉察游乐园 | `d3968cac-2c87-4949-8faf-83eb0dccd02c` |
| 产品 身体藏宝图 | `94ec3d0e-8995-49ba-a3ea-140345db5c5d` |

---

## 三、页面 / 功能结构

### 3.1 文案分层（app_config）

`app_config` 新增 `product_id` 字段，允许为空。

- `product_id` 为空 = 全局默认值
- `product_id` 有值 = 该产品的专属覆盖值

前端取文案时的判断顺序：

1. 查当前 `currentProductId` 对应的该 key 的配置 → 有则用
2. 没有 → 回落到 `product_id IS NULL` 的同 key 配置
3. 仍没有 → 使用代码内的兜底默认值（不得显示空白）

**登录页例外：** `login_title`、`login_subtitle`、`login_button` 在用户选择产品之前渲染，此时没有 `currentProductId`，直接读全局值。

### 3.2 觉察游乐园默认列表视图

在觉察游乐园产品下：

- 地图页默认渲染列表视图
- 隐藏顶部的地图/列表切换 tab
- 列表卡片不显示「第 N 站」序号

其他产品行为完全不变（默认地图视图，切换 tab 正常，序号正常显示）。

**判断方式建议：** 不要硬编码 product_id 到前端。建议在 `products` 表新增 `default_view` 字段（text，默认 `map`），觉察游乐园设为 `list`，前端读该字段决定。这样以后新增产品无需改代码。

### 3.3 preferred_view 按产品区分

当前 `preferred_view` 是全局单一 localStorage key，从一个产品切到另一个产品会带入上一个产品的视图状态。

改为按产品区分：`preferred_view_{productId}`。

旧的全局 key 可保留不迁移，读不到时按 3.2 的产品默认值处理。

### 3.4 管理员笔记页显示产品名

`/admin/notes` 列表每条笔记增加产品名标识。

- 展示形式：标签或独立一列，位置由开发判断，不破坏现有布局
- 不新增筛选器（本次范围外）
- 样式沿用现有古旧羊皮纸色系

### 3.5 学员端笔记页显示产品名（Notes.tsx）

`/notes` 页面的笔记**继续跨产品全部列出，不做过滤**，但每条笔记要能看出所属产品。

保留「所有觉察记录集中在一处」的体验，只补充来源标识。

| Tab | 处理方式 |
|-----|----------|
| 时间轴 | 每条笔记增加产品名，与现有的关卡名、时间并列展示 |
| 关卡 | 产品名显示在关卡分组标题上（关卡归属产品唯一，逐条重复展示冗余） |
| 身体坐标 | **本次不改**，保持现状 |

> 「关卡」tab 把产品名放在分组标题而非每条笔记上，是为了避免同一分组内重复展示。如验收时觉得不够清楚，可改为逐条展示。

### 3.6 地图页探索统计按当前产品计算

地图页顶部的「探索时间：X 分钟｜探索线索：X 条」当前是该用户跨所有产品的全局累计，而地图本身是按 `currentProductId` 的航线渲染的，两者口径不一致。

改为**只统计当前产品范围内的数据**。

`/notes` 页面如另有总数展示，保持全局口径不变（与 3.5 的"全部列出"一致）。

---

## 四、数据来源与查询逻辑

### 4.1 数据库变更

**app_config 新增 product_id：**

```sql
ALTER TABLE app_config ADD COLUMN product_id uuid REFERENCES products(id) DEFAULT NULL;
```

⚠️ **注意主键问题：** `app_config` 当前主键是 `key`。加 `product_id` 后，同一个 key 需要允许多条（一条全局 + 每产品一条），必须调整约束：

```sql
ALTER TABLE app_config DROP CONSTRAINT app_config_pkey;
ALTER TABLE app_config ADD CONSTRAINT app_config_key_product_uniq
  UNIQUE NULLS NOT DISTINCT (key, product_id);
```

`NULLS NOT DISTINCT` 需要 PostgreSQL 15+，当前库是 17，可用。这个写法保证同一个 key 的全局配置只能有一条（默认的 `NULLS DISTINCT` 会允许插入多条 product_id 为空的重复记录）。

**products 新增 default_view：**

```sql
ALTER TABLE products ADD COLUMN default_view text DEFAULT 'map';
UPDATE products SET default_view = 'list'
  WHERE id = 'd3968cac-2c87-4949-8faf-83eb0dccd02c';
```

**现有 23 条 app_config 记录不做任何改动**，product_id 保持为空，继续作为全局默认值生效。

### 4.2 觉察游乐园的文案覆盖

本次只覆盖一条（地图页大标题）：

```sql
INSERT INTO app_config (key, value, description, product_id)
VALUES ('map_title', '觉察游乐园', '觉察游乐园地图页大标题',
        'd3968cac-2c87-4949-8faf-83eb0dccd02c');
```

其余 22 条文案沿用全局默认值。后续需要覆盖更多文案时，按同样方式插入即可，无需改代码。

### 4.3 笔记的产品归属查询

`treasure_notes` 不存 product_id，通过 level 关联：

```sql
SELECT
  u.display_name,
  p.name AS product_name,
  l.name AS level_name,
  tn.content,
  tn.created_at
FROM treasure_notes tn
JOIN users u  ON tn.user_id  = u.id
JOIN levels l ON tn.level_id = l.id
JOIN products p ON l.product_id = p.id
ORDER BY tn.created_at DESC;
```

不新增字段，不改表结构。

### 4.4 学员端笔记查询（Notes.tsx）

现有查询只按 `user_id` 过滤，不带产品信息。改为一并取出产品名：

```typescript
await db.from('treasure_notes')
  .select('*, levels(name, product_id, products(name))')
  .eq('user_id', userId)
```

**不要增加 `product_id` 过滤条件**，笔记仍全部列出。

> 参考：`Notes.tsx` 身体坐标弹窗的查询已经用了类似的嵌套 select 取产品名，可沿用同样写法。

### 4.5 地图页统计按产品过滤

`treasure_notes` 和 `user_progress` 都不存 product_id，需通过 `level_id → levels.product_id` 限定当前产品。

两种实现皆可，由开发选择：

- 先取当前航线的 `level_ids`，用 `.in('level_id', levelIds)` 过滤
- 或用嵌套查询按 `levels.product_id` 过滤

前者与地图渲染的数据源一致，口径更容易对齐。

---

## 五、路由

无新增页面，无路由变更。

---

## 六、验收标准

### 文案分层

- [ ] 进入觉察游乐园，地图页大标题显示「觉察游乐园」
- [ ] 觉察游乐园其余文案（写作区标题、按钮、状态标签等）显示全局默认值，不为空白
- [ ] 进入身体藏宝图，地图页大标题仍显示「身体藏宝图」
- [ ] 登录页文案正常显示（此时无 currentProductId）
- [ ] 数据库中某 key 缺失时，页面显示代码兜底值，不显示空白或报错

### 列表视图

- [ ] 进入觉察游乐园，直接是列表视图，顶部无地图/列表切换 tab
- [ ] 觉察游乐园列表卡片不显示「第 N 站」
- [ ] 觉察游乐园关卡可正常点击进入、播放音频、提交写作

### 视图状态隔离

- [ ] 在身体藏宝图切到列表视图 → 进入觉察游乐园 → 返回身体藏宝图，仍是列表视图
- [ ] 在身体藏宝图使用地图视图 → 进入觉察游乐园（列表）→ 返回身体藏宝图，仍是地图视图

### 笔记产品标识（管理员）

- [ ] `/admin/notes` 每条笔记显示所属产品名
- [ ] 现有的学员筛选、关卡筛选功能不受影响
- [ ] 非管理员访问 `/admin/notes` 仍跳转 `/products`

### 笔记产品标识（学员端）

> 用双产品账号验证（TU005 萍萍 或 TU004 鑫鑫子）

- [ ] `/notes` 时间轴 tab：每条笔记显示产品名、关卡名、时间
- [ ] `/notes` 关卡 tab：分组标题显示产品名
- [ ] 两个 tab 仍列出该用户全部产品的笔记，没有被过滤掉
- [ ] 身体坐标 tab 行为与改动前完全一致
- [ ] 单产品用户（如 TU006、TU007）的笔记页显示正常，产品名不造成视觉干扰

### 探索统计按产品

- [ ] 双产品账号在觉察游乐园地图页，统计只反映游乐园的数据
- [ ] 同一账号切到身体藏宝图，统计只反映藏宝图的数据
- [ ] 两个产品的统计数字相加，等于改动前显示的全局数字
- [ ] 单产品用户的统计数字与改动前一致

### 回归验证（重点，涉及 18 名真实学员）

- [ ] 身体藏宝图默认地图视图，切换 tab 正常，序号正常显示
- [ ] 身体藏宝图所有界面文案与改动前完全一致
- [ ] 身体藏宝图 SVG 连线、解锁逻辑、关卡图标均无变化
- [ ] 音频播放、断点续听、进度同步、写作提交逻辑无变化
- [ ] 单产品权限用户登录后仍自动跳转，不出现产品选择页

---

## 七、后续依赖需求（挂起）

本次不做，记录待排期：

- **RLS 安全加固** — 11 张表均未开启 RLS，anon key 可读写全部数据（含 password_hash 和全部觉察笔记）。因使用自建登录无 `auth.uid()`，需配合前端架构调整，独立立项。**优先级高于本文档所有内容。**
- **一个产品支持多条航线** — 当前地图页查询 routes 使用 `.single()`，一个产品只能有一条航线，分批次推送内容时会失效。
- **AdminNotes 产品筛选器** — 本次只做显示，不做筛选。
- **`/notes` 身体坐标 tab 的多产品处理** — 本次有意保持现状。该 tab 按 body_part 标签聚合，会把不同产品的笔记归到同一身体部位下。这与「点亮身体地图」的跨产品累积理念可能是一致的，需求待明确后再定。
- **学员端笔记页产品筛选** — 本次只做标识，不做筛选。
- **无坐标关卡的兜底排布** — `levels.x/y` 为 null 时节点重叠（A new land 现存此问题）。当前靠建关卡时填写坐标规避。
- **关卡图标映射硬编码** — 按关卡中文名映射 lucide 图标，未匹配则显示默认 MapPin。身体藏宝图第 10 关「地图上隐约还有什么」已受影响。
- **products.theme 是否被前端使用** — 字段存在但用途未验证，可能是占位字段。

---

## 附：给 Claude Code 的指令

请阅读 `prd-multi-product-config_2026-09-05.md`，按照文档开发多产品支持相关改动。涉及文件：`Map.tsx`、`Notes.tsx`、`AdminNotes.tsx`，以及文案读取的公共逻辑。注意：

- 视觉风格沿用现有古旧羊皮纸色系
- 所有查询用 user_id 从 auth store 读取
- 不要改动音频播放、断点续听、写作提交、地图 SVG 渲染、解锁逻辑
- 数据库改动必须带 DEFAULT，保证向后兼容
- 身体藏宝图有 18 名真实学员在用，改动后其界面必须完全不变，请逐条执行验收标准中的回归验证
- 学员端相关改动请用双产品账号（TU005 或 TU004）验证，单产品账号验不出多产品问题
- `/notes` 的「身体坐标」tab 本次不改，请勿改动
- 新开 branch：`feature/multi-product-config`

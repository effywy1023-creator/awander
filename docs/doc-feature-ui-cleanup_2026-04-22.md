# 功能说明 — UI 整理

> 项目：gentle-lore v2 | 提出人：Effy | 记录日期：2026-04-22

---

## 一、功能目标

统一关卡详情页和登录页的视觉样式，消除颜色、字体粗细、卡片风格不一致的问题。

---

## 二、改动范围

涉及两个文件：`LevelDetail.tsx` 和 `Login.tsx`。不改动任何其他文件。

---

## 三、LevelDetail.tsx 改动清单

### 3.1 区块标题颜色统一

所有区块标题（「导引」「探索指南」「挖掘今日宝藏」「藏宝标记点」「其他探险家的发现」）统一使用：

```
text-xs font-medium text-muted-foreground uppercase tracking-wide
```

现在「探索指南」「挖掘今日宝藏」是棕色，需改为 `text-muted-foreground`（灰色）。

---

### 3.2 引导文字卡片（导引区块）

卡片内分两部分，样式不同：

**引导正文**（故事情节 + 准备提示，`---` 分隔线前后的内容）：
```
text-sm leading-relaxed text-foreground
font-style: normal（不斜体）
```

**写作提示**（`writing_id` 对应的提示文字）：
```
text-sm leading-relaxed text-muted-foreground italic
```

现在整个卡片全部斜体棕色，需拆分处理。

---

### 3.3 藏宝标记点（自己的笔记）

每条笔记卡片：
```
bg-muted/50 rounded-xl p-3
笔记内容：text-sm font-normal text-foreground leading-relaxed（去掉粗体）
时间戳：text-xs text-muted-foreground mt-2（保持绝对时间格式不变）
```

现在笔记内容是粗体，需改为 `font-normal`。

---

### 3.4 其他探险家的发现（他人笔记）

每条笔记卡片样式与「导引」区块保持一致，表示这是外部内容、非玩家自己的记录：

```
bg-accent/10 rounded-xl p-3
匿名玩家 + 时间：text-xs text-muted-foreground italic（同色斜体）
笔记内容：text-sm leading-relaxed text-muted-foreground italic
```

现在他人笔记用白底正文样式，需改为暖棕色背景 + 斜体棕色文字。

---

### 3.5 按钮颜色统一

同一页面的「存起来」和「去下一关」两个主按钮颜色需一致。

以「去下一关」现有颜色为准，「存起来」改为相同颜色。

---

## 四、Login.tsx 改动清单

### 4.1 副标题文案

```
改前：输入你的探险编号，开始今日的地图解锁。
改后：输入你的暗号，开始今日的探险。
```

其余登录页内容（按钮文案、颜色、布局）**保持原样不变**。

---

## 五、不要改动的内容

- 时间格式（保持绝对时间）
- 按钮文案
- 按钮颜色色值（沿用现有颜色，只统一两个按钮）
- 地图页
- 任何其他页面和逻辑

---

## 六、验收标准

- [ ] 所有区块标题颜色统一为灰色（text-muted-foreground）
- [ ] 导引卡片：引导正文不斜体，只有写作提示部分是斜体
- [ ] 藏宝标记点笔记内容为 font-normal，不粗体
- [ ] 他人笔记卡片：暖棕色背景 + 斜体棕色文字，与藏宝标记点视觉明显区分
- [ ] 「存起来」和「去下一关」按钮颜色一致
- [ ] 登录页副标题改为「输入你的暗号，开始今日的探险。」
- [ ] 登录页其余内容不变

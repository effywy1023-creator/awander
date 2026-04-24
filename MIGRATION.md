# 迁移说明：Lovable → Vercel

## 背景

本项目原本托管在 Lovable 平台，Supabase 的 URL 和 anon key 直接硬编码在源码中。为了迁移到 Vercel 并遵循安全最佳实践，本次改动将这两个凭据提取为环境变量。

---

## 本次改动的文件

| 文件 | 类型 | 说明 |
|---|---|---|
| `src/integrations/supabase/client.ts` | 修改 | 把硬编码的 URL 和 key 改为读取环境变量，并加入缺失时的错误提示 |
| `.env.local` | 新增 | 本地开发用的真实凭据（已被 .gitignore 忽略，不会提交到 git） |
| `.env.example` | 新增 | 占位符模板，提交到 git，供团队成员参考 |
| `MIGRATION.md` | 新增 | 本文档 |

---

## 本地开发怎么设置

1. 在项目根目录复制模板文件：

   ```bash
   cp .env.example .env.local
   ```

2. 打开 `.env.local`，填入真实的 Supabase 凭据：

   ```
   VITE_SUPABASE_URL=https://xxxx.supabase.co
   VITE_SUPABASE_ANON_KEY=eyJhbG...
   ```

   凭据从 [Supabase 控制台](https://supabase.com/dashboard) → 选择你的项目 → **Project Settings → API** 页面获取：
   - `Project URL` → 填入 `VITE_SUPABASE_URL`
   - `anon public` key → 填入 `VITE_SUPABASE_ANON_KEY`

3. 启动开发服务器：

   ```bash
   npm run dev
   ```

---

## Vercel 部署怎么设置

1. 登录 [Vercel Dashboard](https://vercel.com/dashboard)
2. 进入你的项目 → **Settings → Environment Variables**
3. 添加以下两个变量（Environment 选 Production / Preview / Development 视需求而定）：

   | 变量名 | 值 |
   |---|---|
   | `VITE_SUPABASE_URL` | 你的 Supabase Project URL |
   | `VITE_SUPABASE_ANON_KEY` | 你的 Supabase anon public key |

4. 重新部署（或推送代码触发自动部署）

---

## 排查问题

**报错：`Missing VITE_SUPABASE_URL. Please check your .env.local file.`**

- 本地开发：确认项目根目录有 `.env.local` 文件，且包含 `VITE_SUPABASE_URL=...` 这一行（注意不要有多余空格）
- Vercel 部署：进入 Vercel Dashboard → Settings → Environment Variables，确认变量已添加，然后重新部署

**报错：`Missing VITE_SUPABASE_ANON_KEY. Please check your .env.local file.`**

同上，检查 `VITE_SUPABASE_ANON_KEY` 是否配置正确。

---

## 未来切换 Supabase 项目（比如测试 → 生产）

只需修改环境变量，不需要动任何代码：

- **本地**：修改 `.env.local` 里的两个值，重启开发服务器
- **Vercel**：在 Environment Variables 里更新对应值，重新部署

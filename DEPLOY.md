# 部署指南 — 兆方美迪项目管理系统

本系统支持通过 Docker 部署到任意云平台，推荐使用 **Railway**（免费额度，操作简单）。

---

## 方案一：Railway 一键部署（推荐）

### 前提条件
- 已有 GitHub 账号并将代码推送到 GitHub 仓库
- 注册 [Railway](https://railway.app) 账号（可用 GitHub 登录）

### 步骤

**1. 推送代码到 GitHub**
```bash
git init
git add .
git commit -m "初始化提交"
git remote add origin https://github.com/你的用户名/zfmd-pm.git
git push -u origin main
```

**2. 在 Railway 创建项目**
- 登录 Railway → New Project → Deploy from GitHub repo
- 选择你推送的仓库
- Railway 会自动检测 Dockerfile 并开始构建

**3. 添加 PostgreSQL 数据库**
- 在 Railway 项目中点击 "+ New" → Database → PostgreSQL
- Railway 会自动将 `DATABASE_URL` 注入到服务环境变量中

**4. 配置环境变量**
在 Railway 服务的 Variables 页面添加：

| 变量名 | 值 |
|--------|-----|
| `SESSION_SECRET` | 随机生成的长字符串（32位以上） |
| `NODE_ENV` | `production` |

> `DATABASE_URL` 和 `PORT` 由 Railway 自动注入，无需手动设置

**5. 初始化数据库表**
Railway 提供了 Shell 功能，在服务的 Shell 中执行：
```bash
pnpm --filter db push
```
或者通过 Railway CLI：
```bash
railway run pnpm --filter db push
```

**6. 访问**
Railway 会提供一个 `xxx.up.railway.app` 域名，分享给客户即可访问。

---

## 方案二：Render 部署

1. 注册 [Render](https://render.com) → New Web Service → Connect GitHub repo
2. 设置：
   - **Environment**: Docker
   - **Dockerfile Path**: `./Dockerfile`
3. 添加 PostgreSQL 数据库服务，获取 `DATABASE_URL`
4. 在 Environment Variables 中添加 `SESSION_SECRET` 和 `NODE_ENV=production`

---

## 方案三：本地 Docker 运行（测试用）

```bash
# 1. 复制环境变量文件
cp .env.example .env
# 然后编辑 .env，填入真实的数据库连接地址和密钥

# 2. 构建镜像
docker build -t zfmd-pm .

# 3. 运行容器
docker run -p 8080:8080 --env-file .env zfmd-pm

# 4. 访问
open http://localhost:8080
# 默认账号：ZFMD / ZFMD
```

---

## 初始账号

| 账号 | 密码 |
|------|------|
| ZFMD | ZFMD |

> 首次部署后建议修改密码（目前密码写在代码中，如需多账号或可配置密码请联系开发方）

---

## 注意事项

- 系统所有数据存储在 PostgreSQL，确保数据库有稳定备份
- 一键备份功能可在系统内下载全部数据的 ZIP 压缩包
- 如遇问题，检查 Railway/Render 的日志输出

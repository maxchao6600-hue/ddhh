# 拼豆幸运转盘

顾客打开首页转动转盘。中奖结果由服务器用加密安全随机数按数据库里的最新概率抽出。店主在 `/admin` 里直接修改百分比，保存后下一次抽奖立即生效，不需要重新部署。

概率以整数保存：`100000` 表示 100%。`0.3%` 是 `300`，`38.2%` 是 `38200`。

## 本地运行

需要 Node.js 22.13 或更新版本。本机使用内置的 `node:sqlite`。

```powershell
npm install
npm run dev
```

打开 [http://localhost:3000](http://localhost:3000)。第一次使用先打开 [http://localhost:3000/admin/setup](http://localhost:3000/admin/setup) 创建店主账号。账号只能创建一次，没有公开注册。

也可以在服务器上创建，避免把初始化页面暴露到公网之后才设置密码：

```powershell
$env:ADMIN_USERNAME="owner"
$env:ADMIN_PASSWORD="至少12位并包含字母和数字1"
npm run admin:create
```

不要把真实密码写进代码或提交到仓库。生产环境不要设置 `ARGON2_MEMORY`。未设置时，密码使用 Argon2id，内存 19 MiB，迭代 2 次。

数据库文件默认是 `data/wheel.db`。可以用 `DATABASE_PATH` 改到持久磁盘。请限制这个文件的读取权限，里面有密码哈希和可选的两步验证密钥。

忘记密码时，在能访问数据库文件的机器上删除 `admins` 和 `sessions` 表中的记录，抽奖历史会保留，然后重新初始化。

## 检查

```powershell
npm test
npm run lint
npm run typecheck
npm run build
npm start
```

## 部署

应用运行在 Node.js 上：

```powershell
npm run build
npm start
```

把 `DATABASE_PATH` 指到不会在重启时消失的位置。站点对外开放之前先创建管理员。登录接口每个 IP 15 分钟最多 10 次，抽奖接口每个 IP 每分钟最多 60 次。反向代理需要覆盖 `cf-connecting-ip` 或 `x-forwarded-for`，否则限速只能按未知地址粗略计算。

`migrations/0001_init.sql` 和 `wrangler.toml` 可以直接用于 Cloudflare D1：

```powershell
npx wrangler d1 create bead-prize-wheel
npx wrangler d1 migrations apply bead-prize-wheel --remote
```

创建数据库后，把 `wrangler.toml` 里的 `database_id` 换成真实 ID。当前运行中的 Next.js 进程使用本机 SQLite，因为抽奖、会话和 Argon2 都在 Node.js 里执行。D1 迁移用来保存同一套表结构和初始概率。

## 初始奖品

| 奖品 | 概率 |
| --- | ---: |
| 折扣 50% | 1% |
| 盲盒 | 0.3% |
| 现金 RM50 | 0.5% |
| 全套拼豆工具 | 5% |
| 折扣 5% | 38.2% |
| 折扣 10% | 15% |
| 谢谢惠顾 | 40% |

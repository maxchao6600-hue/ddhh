# 拼豆幸运转盘

顾客打开首页转动转盘。中奖结果由服务器用加密安全随机数按数据库里的最新概率抽出。店主在 `/admin` 里直接修改百分比，保存后下一次抽奖立即生效，不需要重新部署。

概率以整数保存：`100000` 表示 100%。`0.3%` 是 `300`，`38.2%` 是 `38200`。

## 本地运行

需要 Node.js 22.13 或更新版本。本机使用内置的 `node:sqlite`。

```powershell
npm install
npm run dev
```

打开 [http://localhost:3000](http://localhost:3000)。店主只能从 `/admin/login` 登录。网站没有公开注册页面，`/api/setup` 一律返回 403。

空数据库上的第一个店主账号只能在本机用下面的命令创建。如果已经有管理员，这条命令会拒绝执行，不会改密码，也不会再创建一个账号：

```powershell
$env:ADMIN_USERNAME="owner"
$env:ADMIN_PASSWORD="至少12位并包含字母和数字1"
npm run admin:create
```

不要把真实密码写进代码或提交到仓库。生产环境不要设置 `ARGON2_MEMORY`。未设置时，密码使用 Argon2id，内存 19 MiB，迭代 2 次。

数据库文件默认是 `data/wheel.db`。可以用 `DATABASE_PATH` 改到持久磁盘。请限制这个文件的读取权限，里面有密码哈希和可选的两步验证密钥。

网站没有自助找回密码。不要从网站或公开接口删除、重置现有管理员。

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
npx wrangler d1 create ddhh
npx wrangler d1 migrations apply ddhh --remote
npm run deploy
```

创建数据库后，把 `wrangler.toml` 里的 `database_id` 换成真实 ID。本地 `npm run dev` 继续使用本机 SQLite。Cloudflare Worker `ddhh` 使用同名 D1 数据库，部署前用上面的迁移命令建表，不会清空已有抽奖记录。

## 初始奖品

| 奖品 | 概率 |
| --- | ---: |
| 折扣 50% | 1% |
| 盲盒 | 0.3% |
| 现金 RM50 | 0.5% |
| 全套拼豆工具 | 3% |
| 折扣 5% | 10% |
| 折扣 10% | 5% |
| 谢谢惠顾 | 80.2% |

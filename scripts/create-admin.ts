import { createInitialAdmin, needsSetup } from "../src/lib/auth";

const username = process.env.ADMIN_USERNAME ?? "";
const password = process.env.ADMIN_PASSWORD ?? "";

if (!/^[A-Za-z0-9_]{3,32}$/.test(username)) {
  console.error("请设置 ADMIN_USERNAME，使用 3 到 32 位字母、数字或下划线。");
  process.exit(1);
}

if (password.length < 12 || password.length > 128 || !/[A-Za-z]/.test(password) || !/\d/.test(password)) {
  console.error("请设置 ADMIN_PASSWORD，至少 12 位，并同时包含字母和数字。");
  process.exit(1);
}

if (!(await needsSetup())) {
  console.error("管理员已经存在。不会重置密码。");
  process.exit(1);
}

await createInitialAdmin(username, password);
console.log(`已创建管理员 ${username.toLowerCase()}。`);

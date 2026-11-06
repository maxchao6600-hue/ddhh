import { createHash, timingSafeEqual } from "node:crypto";
import { Secret, TOTP } from "otpauth";
import { ApiError } from "@/lib/errors";
import { asNumber, asString, getRow, allRows, runSql, withTransaction } from "@/lib/db";
import { dummyPasswordHash, hashPassword, verifyPassword } from "@/lib/password";
import type { SessionInfo } from "@/lib/types";

export const SESSION_COOKIE = "pw_session";
const SESSION_MS = 12 * 60 * 60 * 1000;
const CHALLENGE_MS = 5 * 60 * 1000;

export type AdminRecord = {
  id: string;
  username: string;
  passwordHash: string;
  totpSecret: string | null;
  totpEnabled: boolean;
};

function sha256(value: string): string {
  return createHash("sha256").update(value).digest("hex");
}

export function safeEqual(left: string, right: string): boolean {
  const a = createHash("sha256").update(left).digest();
  const b = createHash("sha256").update(right).digest();
  return timingSafeEqual(a, b);
}

function randomToken(): string {
  const bytes = new Uint8Array(32);
  crypto.getRandomValues(bytes);
  return Buffer.from(bytes).toString("base64url");
}

function mapAdmin(row: Record<string, unknown>): AdminRecord {
  const secret = row.totp_secret;
  return {
    id: asString(row.id),
    username: asString(row.username),
    passwordHash: asString(row.password_hash),
    totpSecret: typeof secret === "string" ? secret : null,
    totpEnabled: asNumber(row.totp_enabled) === 1,
  };
}

export async function needsSetup(): Promise<boolean> {
  const row = await getRow("SELECT COUNT(*) AS count FROM admins");
  return row ? asNumber(row.count) === 0 : true;
}

export async function createInitialAdmin(username: string, password: string): Promise<void> {
  const normalized = username.toLowerCase();
  const passwordHash = await hashPassword(password);
  const now = new Date().toISOString();
  await withTransaction(async () => {
    if (!(await needsSetup())) throw new ApiError(403, "管理员已经完成初始化");
    await runSql(
      `INSERT INTO admins (id, username, password_hash, totp_secret, totp_enabled, created_at, updated_at)
       VALUES (?, ?, ?, NULL, 0, ?, ?)`,
      [crypto.randomUUID(), normalized, passwordHash, now, now],
    );
  });
}

export async function findAdminByUsername(username: string): Promise<AdminRecord | null> {
  const row = await getRow("SELECT * FROM admins WHERE username = ? COLLATE NOCASE", [username.trim().toLowerCase()]);
  return row ? mapAdmin(row) : null;
}

async function findAdminById(id: string): Promise<AdminRecord | null> {
  const row = await getRow("SELECT * FROM admins WHERE id = ?", [id]);
  return row ? mapAdmin(row) : null;
}

export async function startLogin(
  username: string,
  password: string,
): Promise<{ type: "session"; token: string; session: SessionInfo } | { type: "totp"; challengeId: string }> {
  const admin = await findAdminByUsername(username);
  const hash = admin?.passwordHash ?? (await dummyPasswordHash());
  const matches = await verifyPassword(password, hash);
  if (!admin || !matches) throw new ApiError(401, "用户名或密码不正确");
  if (admin.totpEnabled) {
    const challengeId = crypto.randomUUID();
    const now = new Date();
    await runSql("DELETE FROM login_challenges WHERE admin_id = ?", [admin.id]);
    await runSql(
      `INSERT INTO login_challenges (id, admin_id, attempts, expires_at, created_at)
       VALUES (?, ?, 0, ?, ?)`,
      [challengeId, admin.id, new Date(now.getTime() + CHALLENGE_MS).toISOString(), now.toISOString()],
    );
    return { type: "totp", challengeId };
  }
  const created = await createSession(admin.id);
  return { type: "session", token: created.token, session: created.session };
}

export async function completeTotpLogin(challengeId: string, code: string): Promise<{ token: string; session: SessionInfo }> {
  const row = await getRow("SELECT * FROM login_challenges WHERE id = ?", [challengeId]);
  if (!row) throw new ApiError(401, "登录验证已失效，请重新登录");
  if (new Date(asString(row.expires_at)).getTime() <= Date.now() || asNumber(row.attempts) >= 5) {
    await runSql("DELETE FROM login_challenges WHERE id = ?", [challengeId]);
    throw new ApiError(401, "登录验证已失效，请重新登录");
  }
  const admin = await findAdminById(asString(row.admin_id));
  if (!admin?.totpEnabled || !admin.totpSecret) {
    await runSql("DELETE FROM login_challenges WHERE id = ?", [challengeId]);
    throw new ApiError(401, "登录验证已失效，请重新登录");
  }
  if (!verifyTotp(admin.totpSecret, admin.username, code)) {
    await runSql("UPDATE login_challenges SET attempts = attempts + 1 WHERE id = ?", [challengeId]);
    throw new ApiError(401, "验证码不正确");
  }
  await runSql("DELETE FROM login_challenges WHERE id = ?", [challengeId]);
  return createSession(admin.id);
}

export async function createSession(adminId: string): Promise<{ token: string; session: SessionInfo }> {
  const admin = await findAdminById(adminId);
  if (!admin) throw new ApiError(401, "请先登录");
  const token = randomToken();
  const csrfToken = randomToken();
  const now = new Date();
  const sessionId = crypto.randomUUID();
  await withTransaction(async () => {
    const existing = await allRows(
      "SELECT id FROM sessions WHERE admin_id = ? ORDER BY created_at DESC",
      [adminId],
    );
    for (const stale of existing.slice(4)) {
      await runSql("DELETE FROM sessions WHERE id = ?", [asString(stale.id)]);
    }
    await runSql(
      `INSERT INTO sessions (id, admin_id, token_hash, csrf_token, expires_at, created_at)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [
        sessionId,
        adminId,
        sha256(token),
        csrfToken,
        new Date(now.getTime() + SESSION_MS).toISOString(),
        now.toISOString(),
      ],
    );
  });
  return {
    token,
    session: {
      id: adminId,
      username: admin.username,
      csrfToken,
      totpEnabled: admin.totpEnabled,
    },
  };
}

export async function findSession(token: string): Promise<SessionInfo | null> {
  if (!token) return null;
  const row = await getRow(
    `SELECT sessions.admin_id, sessions.csrf_token, sessions.expires_at, admins.username, admins.totp_enabled
     FROM sessions JOIN admins ON admins.id = sessions.admin_id
     WHERE sessions.token_hash = ?`,
    [sha256(token)],
  );
  if (!row) return null;
  if (new Date(asString(row.expires_at)).getTime() <= Date.now()) {
    await runSql("DELETE FROM sessions WHERE token_hash = ?", [sha256(token)]);
    return null;
  }
  return {
    id: asString(row.admin_id),
    username: asString(row.username),
    csrfToken: asString(row.csrf_token),
    totpEnabled: asNumber(row.totp_enabled) === 1,
  };
}

export async function revokeSession(token: string): Promise<void> {
  if (!token) return;
  await runSql("DELETE FROM sessions WHERE token_hash = ?", [sha256(token)]);
}

export function assertCsrf(session: SessionInfo, header: string | null): void {
  if (!header || !safeEqual(header, session.csrfToken)) {
    throw new ApiError(403, "页面已过期，请刷新后重试");
  }
}

function totpFor(secret: string, username: string): TOTP {
  return new TOTP({
    issuer: "BeadWheel",
    label: username,
    algorithm: "SHA1",
    digits: 6,
    period: 30,
    secret: Secret.fromBase32(secret),
  });
}

export function verifyTotp(secret: string, username: string, code: string): boolean {
  const delta = totpFor(secret, username).validate({ token: code, window: 1 });
  return delta !== null;
}

export async function beginTotpSetup(adminId: string, username: string): Promise<{ secret: string; uri: string }> {
  const secret = new Secret({ size: 20 }).base32;
  const now = new Date().toISOString();
  await runSql("UPDATE admins SET totp_secret = ?, totp_enabled = 0, updated_at = ? WHERE id = ?", [
    secret,
    now,
    adminId,
  ]);
  return { secret, uri: totpFor(secret, username).toString() };
}

export async function enableTotp(adminId: string, username: string, code: string): Promise<void> {
  const admin = await findAdminById(adminId);
  if (!admin?.totpSecret) throw new ApiError(400, "请先生成验证器密钥");
  if (!verifyTotp(admin.totpSecret, username, code)) throw new ApiError(400, "验证码不正确");
  await runSql("UPDATE admins SET totp_enabled = 1, updated_at = ? WHERE id = ?", [
    new Date().toISOString(),
    adminId,
  ]);
}

export async function disableTotp(adminId: string, password: string, code: string): Promise<void> {
  const admin = await findAdminById(adminId);
  if (!admin) throw new ApiError(401, "请先登录");
  const matches = await verifyPassword(password, admin.passwordHash);
  if (!matches) throw new ApiError(401, "密码不正确");
  if (!admin.totpEnabled || !admin.totpSecret || !verifyTotp(admin.totpSecret, admin.username, code)) {
    throw new ApiError(400, "验证码不正确");
  }
  await runSql("UPDATE admins SET totp_secret = NULL, totp_enabled = 0, updated_at = ? WHERE id = ?", [
    new Date().toISOString(),
    adminId,
  ]);
}

export function sessionTokenHash(token: string): string {
  return sha256(token);
}

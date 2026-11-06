import { z } from "zod";

const uuidPattern =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export const spinBodySchema = z.object({
  drawId: z.string().regex(uuidPattern, "抽奖编号无效"),
});

export function parseSpinBody(body: unknown): { drawId: string } {
  const parsed = spinBodySchema.parse(body);
  return { drawId: parsed.drawId };
}

const prizeNameSchema = z
  .string()
  .trim()
  .min(1, "请填写奖品名称")
  .max(40, "奖品名称最多 40 个字")
  .refine((name) => !/[\u0000-\u001F\u007F<>]/.test(name), "奖品名称包含无效字符");

export const prizeInputSchema = z.object({
  id: z.number().int().positive().nullable(),
  name: prizeNameSchema,
  probability: z.string().trim().min(1, "请填写概率").max(16, "概率格式无效"),
  color: z.string().regex(/^#[0-9A-Fa-f]{6}$/, "颜色格式无效"),
  isActive: z.boolean(),
  countsAsWin: z.boolean(),
});

export const savePrizesSchema = z.object({
  prizes: z.array(prizeInputSchema).min(1, "至少保留一个奖品").max(30, "奖品最多 30 个"),
  deleteIds: z.array(z.number().int().positive()).max(30),
});

export const settingsSchema = z.object({
  wheelName: z.string().trim().min(1, "请填写转盘名称").max(40, "转盘名称最多 40 个字"),
  isEnabled: z.boolean(),
});

export const setupSchema = z.object({
  username: z
    .string()
    .trim()
    .regex(/^[A-Za-z0-9_]{3,32}$/, "用户名需要 3 到 32 位字母、数字或下划线"),
  password: z
    .string()
    .min(12, "密码至少 12 位")
    .max(128, "密码过长")
    .refine((password) => /[A-Za-z]/.test(password) && /\d/.test(password), "密码至少包含一个字母和一个数字"),
});

export const loginSchema = z.object({
  username: z.string().trim().min(1, "请填写用户名").max(32),
  password: z.string().min(1, "请填写密码").max(128),
});

export const totpSchema = z.object({
  challengeId: z.string().regex(uuidPattern, "登录验证已失效"),
  code: z.string().regex(/^\d{6}$/, "请输入 6 位验证码"),
});

export const totpCodeSchema = z.object({
  code: z.string().regex(/^\d{6}$/, "请输入 6 位验证码"),
});

export const disableTotpSchema = z.object({
  password: z.string().min(1).max(128),
  code: z.string().regex(/^\d{6}$/, "请输入 6 位验证码"),
});

export async function readJson(request: Request): Promise<unknown> {
  const declared = Number(request.headers.get("content-length") ?? 0);
  if (Number.isFinite(declared) && declared > 200_000) {
    throw new Error("TOO_LARGE");
  }
  const text = await request.text();
  if (text.length > 200_000) throw new Error("TOO_LARGE");
  try {
    return JSON.parse(text) as unknown;
  } catch {
    throw new Error("BAD_JSON");
  }
}

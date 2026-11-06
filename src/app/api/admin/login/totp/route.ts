import { cookies } from "next/headers";
import { unstable_rethrow } from "next/navigation";
import { connection } from "next/server";
import { completeTotpLogin, SESSION_COOKIE } from "@/lib/auth";
import { getClientIp, sessionCookieOptions } from "@/lib/current-admin";
import { json, toErrorResponse } from "@/lib/http";
import { clientKey, consumeRateLimit } from "@/lib/rate-limit";
import { readJson, totpSchema } from "@/lib/validation";

export async function POST(request: Request) {
  await connection();
  try {
    consumeRateLimit(clientKey("totp", await getClientIp()), 10, 15 * 60 * 1000);
    const body = totpSchema.parse(await readJson(request));
    const result = await completeTotpLogin(body.challengeId, body.code);
    const jar = await cookies();
    jar.set(SESSION_COOKIE, result.token, sessionCookieOptions(60 * 60 * 12));
    return json({ ok: true, username: result.session.username });
  } catch (error) {
    unstable_rethrow(error);
    return toErrorResponse(error);
  }
}

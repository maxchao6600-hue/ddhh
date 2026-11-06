import { cookies } from "next/headers";
import { unstable_rethrow } from "next/navigation";
import { connection } from "next/server";
import { SESSION_COOKIE, startLogin } from "@/lib/auth";
import { getClientIp, sessionCookieOptions } from "@/lib/current-admin";
import { json, toErrorResponse } from "@/lib/http";
import { clientKey, consumeRateLimit } from "@/lib/rate-limit";
import { loginSchema, readJson } from "@/lib/validation";

export async function POST(request: Request) {
  await connection();
  try {
    consumeRateLimit(clientKey("login", await getClientIp()), 10, 15 * 60 * 1000);
    const body = loginSchema.parse(await readJson(request));
    const result = await startLogin(body.username, body.password);
    if (result.type === "totp") {
      return json({ totpRequired: true, challengeId: result.challengeId });
    }
    const jar = await cookies();
    jar.set(SESSION_COOKIE, result.token, sessionCookieOptions(60 * 60 * 12));
    return json({ ok: true, username: result.session.username });
  } catch (error) {
    unstable_rethrow(error);
    return toErrorResponse(error);
  }
}

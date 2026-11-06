import { cookies } from "next/headers";
import { unstable_rethrow } from "next/navigation";
import { connection } from "next/server";
import { revokeSession, SESSION_COOKIE } from "@/lib/auth";
import { requireApiAdmin, sessionCookieOptions } from "@/lib/current-admin";
import { json, toErrorResponse } from "@/lib/http";

export async function POST(request: Request) {
  await connection();
  try {
    await requireApiAdmin(request, true);
    const jar = await cookies();
    const token = jar.get(SESSION_COOKIE)?.value;
    if (token) revokeSession(token);
    jar.set(SESSION_COOKIE, "", sessionCookieOptions(0));
    return json({ ok: true });
  } catch (error) {
    unstable_rethrow(error);
    return toErrorResponse(error);
  }
}

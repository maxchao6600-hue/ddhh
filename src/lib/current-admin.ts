import { cookies, headers } from "next/headers";
import { connection } from "next/server";
import { redirect } from "next/navigation";
import { assertCsrf, findSession, SESSION_COOKIE } from "@/lib/auth";
import { ApiError } from "@/lib/errors";
import type { SessionInfo } from "@/lib/types";

export async function readSession(): Promise<SessionInfo | null> {
  await connection();
  const jar = await cookies();
  const token = jar.get(SESSION_COOKIE)?.value;
  if (!token) return null;
  return findSession(token);
}

export async function requirePageAdmin(): Promise<SessionInfo> {
  const session = await readSession();
  if (!session) redirect("/admin/login");
  return session;
}

export async function requireApiAdmin(request: Request, mutating: boolean): Promise<SessionInfo> {
  const session = await readSession();
  if (!session) throw new ApiError(401, "请先登录");
  if (mutating) assertCsrf(session, request.headers.get("x-csrf-token"));
  return session;
}

export function clientIpFromRequest(request: Request): string {
  return ipFromHeaders(request.headers);
}

export async function getClientIp(): Promise<string> {
  return ipFromHeaders(await headers());
}

function ipFromHeaders(headerList: { get(name: string): string | null }): string {
  const cloudflare = headerList.get("cf-connecting-ip")?.trim();
  if (cloudflare) return cloudflare;
  const realIp = headerList.get("x-real-ip")?.trim();
  if (realIp) return realIp;
  const forwarded = headerList.get("x-forwarded-for");
  if (forwarded) return forwarded.split(",")[0]?.trim() || "unknown";
  return "unknown";
}

export function sessionCookieOptions(maxAge: number): {
  httpOnly: true;
  sameSite: "lax";
  secure: boolean;
  path: string;
  maxAge: number;
} {
  return {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge,
  };
}

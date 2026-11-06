import { ZodError } from "zod";
import { ApiError } from "@/lib/errors";

export function json(data: unknown, status = 200): Response {
  return Response.json(data, {
    status,
    headers: { "cache-control": "no-store" },
  });
}

export function toErrorResponse(error: unknown): Response {
  if (error instanceof ApiError) return json({ success: false, error: error.message }, error.status);
  if (error instanceof ZodError) {
    return json({ success: false, error: error.issues[0]?.message ?? "请求参数无效" }, 400);
  }
  if (error instanceof Error && error.message === "TOO_LARGE") {
    return json({ success: false, error: "请求内容过大" }, 413);
  }
  if (error instanceof Error && error.message === "BAD_JSON") {
    return json({ success: false, error: "请求格式无效" }, 400);
  }
  console.error(error);
  return json({ success: false, error: "服务器暂时无法完成请求" }, 500);
}

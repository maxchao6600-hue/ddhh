import { unstable_rethrow } from "next/navigation";
import { connection } from "next/server";
import { requireApiAdmin } from "@/lib/current-admin";
import { json, toErrorResponse } from "@/lib/http";
import { listAudit } from "@/lib/prizes";

export async function GET(request: Request) {
  await connection();
  try {
    await requireApiAdmin(request, false);
    const limit = Number(new URL(request.url).searchParams.get("limit") ?? 50);
    return json({ logs: await listAudit(Number.isFinite(limit) ? limit : 50) });
  } catch (error) {
    unstable_rethrow(error);
    return toErrorResponse(error);
  }
}

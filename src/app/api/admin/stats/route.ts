import { unstable_rethrow } from "next/navigation";
import { connection } from "next/server";
import { requireApiAdmin } from "@/lib/current-admin";
import { json, toErrorResponse } from "@/lib/http";
import { getStats } from "@/lib/stats";

export async function GET(request: Request) {
  await connection();
  try {
    await requireApiAdmin(request, false);
    return json(await getStats());
  } catch (error) {
    unstable_rethrow(error);
    return toErrorResponse(error);
  }
}

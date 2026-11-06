import { unstable_rethrow } from "next/navigation";
import { connection } from "next/server";
import { disableTotp } from "@/lib/auth";
import { requireApiAdmin } from "@/lib/current-admin";
import { json, toErrorResponse } from "@/lib/http";
import { disableTotpSchema, readJson } from "@/lib/validation";

export async function POST(request: Request) {
  await connection();
  try {
    const admin = await requireApiAdmin(request, true);
    const body = disableTotpSchema.parse(await readJson(request));
    await disableTotp(admin.id, body.password, body.code);
    return json({ ok: true });
  } catch (error) {
    unstable_rethrow(error);
    return toErrorResponse(error);
  }
}

import { unstable_rethrow } from "next/navigation";
import { connection } from "next/server";
import { createInitialAdmin, needsSetup } from "@/lib/auth";
import { getClientIp } from "@/lib/current-admin";
import { json, toErrorResponse } from "@/lib/http";
import { clientKey, consumeRateLimit } from "@/lib/rate-limit";
import { readJson, setupSchema } from "@/lib/validation";

export async function GET() {
  await connection();
  try {
    return json({ needsSetup: needsSetup() });
  } catch (error) {
    unstable_rethrow(error);
    return toErrorResponse(error);
  }
}

export async function POST(request: Request) {
  await connection();
  try {
    consumeRateLimit(clientKey("setup", await getClientIp()), 5, 60 * 60 * 1000);
    const body = setupSchema.parse(await readJson(request));
    await createInitialAdmin(body.username, body.password);
    return json({ ok: true });
  } catch (error) {
    unstable_rethrow(error);
    return toErrorResponse(error);
  }
}

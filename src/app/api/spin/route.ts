import { unstable_rethrow } from "next/navigation";
import { connection } from "next/server";
import { clientIpFromRequest } from "@/lib/current-admin";
import { json, toErrorResponse } from "@/lib/http";
import { clientKey, consumeRateLimit } from "@/lib/rate-limit";
import { executeSpin, peekSpin } from "@/lib/spin";
import { parseSpinBody, readJson } from "@/lib/validation";

export async function POST(request: Request) {
  await connection();
  try {
    const body = parseSpinBody(await readJson(request));
    const existing = await peekSpin(body.drawId);
    if (existing) return json(existing);
    await consumeRateLimit(clientKey("spin", clientIpFromRequest(request)), 60, 60_000);
    return json(await executeSpin(body.drawId));
  } catch (error) {
    unstable_rethrow(error);
    return toErrorResponse(error);
  }
}

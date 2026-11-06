import { unstable_rethrow } from "next/navigation";
import { connection } from "next/server";
import { requireApiAdmin } from "@/lib/current-admin";
import { json, toErrorResponse } from "@/lib/http";
import { getSettings, updateSettings } from "@/lib/prizes";
import { readJson, settingsSchema } from "@/lib/validation";

export async function GET(request: Request) {
  await connection();
  try {
    await requireApiAdmin(request, false);
    return json(await getSettings());
  } catch (error) {
    unstable_rethrow(error);
    return toErrorResponse(error);
  }
}

export async function PATCH(request: Request) {
  await connection();
  try {
    await requireApiAdmin(request, true);
    const body = settingsSchema.parse(await readJson(request));
    return json(await updateSettings(body));
  } catch (error) {
    unstable_rethrow(error);
    return toErrorResponse(error);
  }
}

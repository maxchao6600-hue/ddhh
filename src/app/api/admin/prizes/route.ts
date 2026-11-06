import { unstable_rethrow } from "next/navigation";
import { connection } from "next/server";
import { requireApiAdmin } from "@/lib/current-admin";
import { json, toErrorResponse } from "@/lib/http";
import { getSettings, listPrizeRows, savePrizes, toAdminPrize } from "@/lib/prizes";
import { readJson, savePrizesSchema } from "@/lib/validation";

export async function GET(request: Request) {
  await connection();
  try {
    await requireApiAdmin(request, false);
    const settings = getSettings();
    return json({
      prizes: listPrizeRows().map(toAdminPrize),
      configVersion: settings.configVersion,
    });
  } catch (error) {
    unstable_rethrow(error);
    return toErrorResponse(error);
  }
}

export async function PUT(request: Request) {
  await connection();
  try {
    const admin = await requireApiAdmin(request, true);
    const body = savePrizesSchema.parse(await readJson(request));
    return json(savePrizes(admin.id, body));
  } catch (error) {
    unstable_rethrow(error);
    return toErrorResponse(error);
  }
}

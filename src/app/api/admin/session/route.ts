import { unstable_rethrow } from "next/navigation";
import { connection } from "next/server";
import { requireApiAdmin } from "@/lib/current-admin";
import { json, toErrorResponse } from "@/lib/http";

export async function GET(request: Request) {
  await connection();
  try {
    const session = await requireApiAdmin(request, false);
    return json({
      username: session.username,
      totpEnabled: session.totpEnabled,
      csrfToken: session.csrfToken,
    });
  } catch (error) {
    unstable_rethrow(error);
    return toErrorResponse(error);
  }
}

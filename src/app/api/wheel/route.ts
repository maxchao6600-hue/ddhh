import { unstable_rethrow } from "next/navigation";
import { connection } from "next/server";
import { json, toErrorResponse } from "@/lib/http";
import { getPublicWheel } from "@/lib/prizes";

export async function GET() {
  await connection();
  try {
    return json(await getPublicWheel());
  } catch (error) {
    unstable_rethrow(error);
    return toErrorResponse(error);
  }
}

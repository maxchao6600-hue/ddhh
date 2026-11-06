import QRCode from "qrcode";
import { unstable_rethrow } from "next/navigation";
import { connection } from "next/server";
import { beginTotpSetup } from "@/lib/auth";
import { requireApiAdmin } from "@/lib/current-admin";
import { json, toErrorResponse } from "@/lib/http";

export async function POST(request: Request) {
  await connection();
  try {
    const admin = await requireApiAdmin(request, true);
    const setup = await beginTotpSetup(admin.id, admin.username);
    const qrDataUrl = await QRCode.toDataURL(setup.uri, { margin: 1, width: 280, errorCorrectionLevel: "M" });
    return json({ qrDataUrl, uri: setup.uri, secret: setup.secret });
  } catch (error) {
    unstable_rethrow(error);
    return toErrorResponse(error);
  }
}

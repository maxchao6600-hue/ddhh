import { describe, expect, it } from "vitest";
import { GET, POST } from "@/app/api/setup/route";
import { asNumber, getRow } from "@/lib/db";
import { useTestDatabase } from "./helpers";

describe("public admin registration", () => {
  useTestDatabase();

  it("rejects setup requests and does not create an administrator", async () => {
    const getResponse = GET();
    const postResponse = POST();
    expect(getResponse.status).toBe(403);
    expect(postResponse.status).toBe(403);
    await expect(getResponse.json()).resolves.toMatchObject({ success: false });
    await expect(postResponse.json()).resolves.toMatchObject({ success: false });
    const row = await getRow("SELECT COUNT(*) AS count FROM admins");
    expect(row ? asNumber(row.count) : 0).toBe(0);
  });
});

import { Secret, TOTP } from "otpauth";
import { describe, expect, it } from "vitest";
import { ApiError } from "@/lib/errors";
import { asNumber, asString, getRow } from "@/lib/db";
import { formatProbability } from "@/lib/probability";
import {
  assertCsrf,
  beginTotpSetup,
  completeTotpLogin,
  createInitialAdmin,
  enableTotp,
  findSession,
  needsSetup,
  sessionTokenHash,
  startLogin,
} from "@/lib/auth";
import { listAudit, listPrizeRows, savePrizes } from "@/lib/prizes";
import { consumeRateLimit } from "@/lib/rate-limit";
import { parseSpinBody } from "@/lib/validation";
import { useTestDatabase } from "./helpers";

describe("prize editing and admin auth", () => {
  useTestDatabase();

  async function adminId(): Promise<string> {
    await createInitialAdmin("Owner", "correct-horse-1");
    const row = await getRow("SELECT id FROM admins");
    if (!row) throw new Error("missing admin");
    return asString(row.id);
  }

  it("rejects totals that are not exactly 100% and keeps the old values", async () => {
    const id = await adminId();
    const prizes = await listPrizeRows();
    await expect(
      savePrizes(id, {
        deleteIds: [],
        prizes: prizes.map((prize) => ({
          id: prize.id,
          name: prize.name,
          probability: prize.id === 5 ? "9.9" : formatProbability(prize.probability),
          color: prize.color,
          isActive: prize.isActive,
          countsAsWin: prize.countsAsWin,
        })),
      }),
    ).rejects.toThrow(/100%/);
    expect((await listPrizeRows()).find((prize) => prize.id === 5)?.probability).toBe(10000);
    expect(await listAudit()).toHaveLength(0);
  });

  it("applies a decimal edit immediately and writes an audit row", async () => {
    const id = await adminId();
    const prizes = await listPrizeRows();
    const saved = await savePrizes(id, {
      deleteIds: [],
      prizes: prizes.map((prize) => ({
        id: prize.id,
        name: prize.id === 3 ? "现金 RM50" : prize.name,
        probability: prize.id === 5 ? "10.000" : prize.id === 3 ? "0.500" : formatProbability(prize.probability),
        color: prize.color,
        isActive: true,
        countsAsWin: prize.countsAsWin,
      })),
    });
    expect(saved.unchanged).toBe(true);
    expect(saved.configVersion).toBe(1);

    const changed = await savePrizes(id, {
      deleteIds: [],
      prizes: prizes.map((prize) => ({
        id: prize.id,
        name: prize.name,
        probability: prize.id === 2 ? "0.8" : prize.id === 5 ? "9.5" : formatProbability(prize.probability),
        color: prize.color,
        isActive: true,
        countsAsWin: prize.countsAsWin,
      })),
    });
    expect(changed.configVersion).toBe(2);
    expect(changed.prizes.find((prize) => prize.id === 2)?.probability).toBe("0.8");
    expect(changed.prizes.find((prize) => prize.id === 5)?.probability).toBe("9.5");
    const audit = await listAudit();
    expect(audit).toHaveLength(2);
    expect(audit.map((row) => row.adminId)).toEqual([id, id]);
    expect(audit.map((row) => row.oldProbability).sort()).toEqual(["0.3", "10"]);
    expect(audit.map((row) => row.newProbability).sort()).toEqual(["0.8", "9.5"]);
  });

  it("stores a hostile name as text and still has the spin table", async () => {
    const id = await adminId();
    const prizes = await listPrizeRows();
    const hostile = "'); DROP TABLE spin_records; --";
    await savePrizes(id, {
      deleteIds: [],
      prizes: prizes.map((prize) => ({
        id: prize.id,
        name: prize.id === 7 ? hostile : prize.name,
        probability: formatProbability(prize.probability),
        color: prize.color,
        isActive: true,
        countsAsWin: prize.countsAsWin,
      })),
    });
    expect((await listPrizeRows()).find((prize) => prize.id === 7)?.name).toBe(hostile);
    expect(await getRow("SELECT COUNT(*) AS count FROM spin_records")).toBeTruthy();
  });

  it("hashes passwords, rejects unknown sessions, and supports TOTP", async () => {
    expect(await needsSetup()).toBe(true);
    await createInitialAdmin("owner", "correct-horse-1");
    expect(await needsSetup()).toBe(false);
    await expect(createInitialAdmin("other", "correct-horse-1")).rejects.toBeInstanceOf(ApiError);
    await expect(startLogin("owner", "wrong-password-1")).rejects.toThrow(/不正确/);
    const stored = await getRow("SELECT password_hash FROM admins");
    expect(stored ? asString(stored.password_hash) : "").not.toContain("correct-horse-1");

    const loggedIn = await startLogin("owner", "correct-horse-1");
    expect(loggedIn.type).toBe("session");
    if (loggedIn.type !== "session") return;
    const row = await getRow("SELECT token_hash FROM sessions");
    expect(row ? asString(row.token_hash) : "").toBe(sessionTokenHash(loggedIn.token));
    expect(await findSession("not-a-session")).toBeNull();
    const session = await findSession(loggedIn.token);
    expect(session).not.toBeNull();
    if (!session) return;
    expect(() => assertCsrf(session, "wrong")).toThrow(ApiError);
    assertCsrf(session, session.csrfToken);

    const setup = await beginTotpSetup(session.id, session.username);
    const code = new TOTP({
      issuer: "BeadWheel",
      label: session.username,
      algorithm: "SHA1",
      digits: 6,
      period: 30,
      secret: Secret.fromBase32(setup.secret),
    }).generate();
    await enableTotp(session.id, session.username, code);
    const challenge = await startLogin("owner", "correct-horse-1");
    expect(challenge.type).toBe("totp");
    if (challenge.type !== "totp") return;
    const finished = await completeTotpLogin(challenge.challengeId, code);
    expect((await findSession(finished.token))?.totpEnabled).toBe(true);
  });

  it("rate limits repeated attempts", async () => {
    const now = 1_000_000;
    await consumeRateLimit("spin:test", 2, 1000, now);
    await consumeRateLimit("spin:test", 2, 1000, now + 10);
    await expect(consumeRateLimit("spin:test", 2, 1000, now + 20)).rejects.toBeInstanceOf(ApiError);
    await consumeRateLimit("spin:test", 2, 1000, now + 2000);
  });

  it("ignores a customer-supplied prize id", () => {
    const drawId = crypto.randomUUID();
    expect(parseSpinBody({ drawId, prizeId: 1, probability: "100" })).toEqual({ drawId });
  });

  it("assigns the next prize id after the seeded seven", async () => {
    const id = await adminId();
    const prizes = await listPrizeRows();
    const saved = await savePrizes(id, {
      deleteIds: [],
      prizes: [
        ...prizes.map((prize) => ({
          id: prize.id,
          name: prize.name,
          probability: prize.id === 7 ? "79.2" : formatProbability(prize.probability),
          color: prize.color,
          isActive: true,
          countsAsWin: prize.countsAsWin,
        })),
        {
          id: null,
          name: "新贴纸",
          probability: "1",
          color: "#0F766E",
          isActive: true,
          countsAsWin: true,
        },
      ],
    });
    expect(saved.prizes.some((prize) => prize.id === 8 && prize.name === "新贴纸")).toBe(true);
    expect(asNumber((await getRow("SELECT COUNT(*) AS count FROM probability_audit_logs"))?.count)).toBeGreaterThan(0);
  });
});

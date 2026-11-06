import { describe, expect, it } from "vitest";
import { ApiError } from "@/lib/errors";
import { asNumber, asString, getRow, runSql } from "@/lib/db";
import { createInitialAdmin } from "@/lib/auth";
import { formatProbability } from "@/lib/probability";
import { getSettings, listPrizeRows, savePrizes, visibleSegments } from "@/lib/prizes";
import { setRandomSourceForTests } from "@/lib/random";
import { executeSpin } from "@/lib/spin";
import { buildEqualArcs, nextWheelRotation, prizeAtPointer } from "@/lib/wheel-geometry";
import { useTestDatabase } from "./helpers";

describe("spin records", () => {
  useTestDatabase();

  it("stores the seed probabilities and can land on every prize", async () => {
    const prizes = listPrizeRows();
    expect(prizes.map((prize) => [prize.id, prize.name, prize.probability])).toEqual([
      [1, "折扣 50%", 1000],
      [2, "盲盒", 300],
      [3, "现金 RM50", 500],
      [4, "全套拼豆工具", 5000],
      [5, "折扣 5%", 38200],
      [6, "折扣 10%", 15000],
      [7, "谢谢惠顾", 40000],
    ]);
    expect(prizes.reduce((sum, prize) => sum + prize.probability, 0)).toBe(100000);

    const tickets = [0, 1000, 1300, 1800, 11800, 50000, 65000];
    const expected = [1, 2, 3, 4, 5, 6, 7];
    for (let index = 0; index < tickets.length; index += 1) {
      const ticket = tickets[index] ?? 0;
      setRandomSourceForTests((max) => (max === 100000 ? ticket : 0));
      const result = executeSpin(crypto.randomUUID());
      expect(result.success).toBe(true);
      expect(result.prizeId).toBe(expected[index]);
      expect(result.configurationVersion).toBe(result.configVersion);
      expect(result.probability).toBe(formatProbability(result.probabilityMilli));
      const arcs = buildEqualArcs(result.segments);
      expect(new Set(arcs.map((arc) => arc.sweep)).size).toBe(1);
      const rotation = nextWheelRotation(40, arcs, result.prizeId, result.landingRatio, 6);
      expect(prizeAtPointer(arcs, rotation)).toBe(result.prizeId);
    }
  });

  it("keeps the original snapshot after probabilities change", async () => {
    setRandomSourceForTests((max) => (max === 100000 ? 0 : 0));
    const first = executeSpin(crypto.randomUUID());
    expect(first.prizeId).toBe(1);
    expect(first.probabilityMilli).toBe(1000);
    expect(first.configVersion).toBe(1);

    await createInitialAdmin("owner", "correct-horse-1");
    const admin = getRow("SELECT id FROM admins");
    if (!admin) throw new Error("missing admin");
    const prizes = listPrizeRows();
    savePrizes(asString(admin.id), {
      deleteIds: [],
      prizes: prizes.map((prize) => ({
        id: prize.id,
        name: prize.name,
        probability: prize.id === 1 ? "0" : prize.id === 2 ? "1.3" : formatProbability(prize.probability),
        color: prize.color,
        isActive: true,
        countsAsWin: prize.countsAsWin,
      })),
    });

    const replay = executeSpin(first.drawId);
    expect(replay.replayed).toBe(true);
    expect(replay.prizeId).toBe(1);
    expect(replay.probabilityMilli).toBe(1000);
    const stored = getRow("SELECT probability_snapshot, config_version FROM spin_records WHERE draw_id = ?", [
      first.drawId,
    ]);
    expect(stored ? asNumber(stored.probability_snapshot) : 0).toBe(1000);
    expect(stored ? asNumber(stored.config_version) : 0).toBe(1);

    const second = executeSpin(crypto.randomUUID());
    expect(second.prizeId).toBe(2);
    expect(second.configVersion).toBe(2);
    expect(getSettings().configVersion).toBe(2);
  });

  it("does not create duplicate records for the same draw id", async () => {
    const drawId = crypto.randomUUID();
    const results = await Promise.all(
      Array.from({ length: 8 }, () => Promise.resolve().then(() => executeSpin(drawId))),
    );
    expect(new Set(results.map((result) => result.prizeId)).size).toBe(1);
    const count = getRow("SELECT COUNT(*) AS count FROM spin_records");
    expect(count ? asNumber(count.count) : 0).toBe(1);
  });

  it("skips disabled and zero-probability prizes", () => {
    runSql("UPDATE wheel_prizes SET is_active = 0, probability = 50000 WHERE id = 4");
    runSql("UPDATE wheel_prizes SET probability = 0 WHERE id = 2");
    runSql("UPDATE wheel_prizes SET probability = 43500 WHERE id = 5");
    const visible = visibleSegments().map((segment) => segment.id);
    expect(visible).not.toContain(4);
    expect(visible).not.toContain(2);
    for (const ticket of [0, 999, 1000, 25000, 99999]) {
      setRandomSourceForTests((max) => (max === 100000 ? ticket : 0));
      const result = executeSpin(crypto.randomUUID());
      expect(result.prizeId).not.toBe(4);
      expect(result.prizeId).not.toBe(2);
    }
  });

  it("refuses to spin when the active total is not exactly 100%", () => {
    runSql("UPDATE wheel_prizes SET probability = 999 WHERE id = 1");
    expect(() => executeSpin(crypto.randomUUID())).toThrow(ApiError);
  });

  it("refuses to spin when the wheel is disabled", () => {
    runSql("UPDATE wheel_settings SET is_enabled = 0 WHERE id = 1");
    expect(() => executeSpin(crypto.randomUUID())).toThrow(/关闭/);
  });
});

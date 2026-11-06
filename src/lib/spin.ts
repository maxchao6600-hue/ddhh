import { ApiError } from "@/lib/errors";
import { asNumber, asString, getRow, isUniqueConstraint, runSql, withTransaction } from "@/lib/db";
import { formatProbability, PROBABILITY_SCALE } from "@/lib/probability";
import { randomIntBelow } from "@/lib/random";
import { selectByTicket } from "@/lib/selection";
import { getSettings, listPrizeRows, toPublicSegment } from "@/lib/prizes";
import { buildEqualArcs } from "@/lib/wheel-geometry";
import type { PublicSegment, SpinResponse } from "@/lib/types";

function segmentsFromSnapshot(snapshot: string): PublicSegment[] {
  const parsed: unknown = JSON.parse(snapshot);
  if (!Array.isArray(parsed)) throw new Error("抽奖快照无效");
  return parsed.map((item) => {
    if (!item || typeof item !== "object") throw new Error("抽奖快照无效");
    const row = item as Record<string, unknown>;
    return {
      id: asNumber(row.id),
      name: asString(row.name),
      color: asString(row.color),
      probabilityMilli: asNumber(row.probabilityMilli),
      displayOrder: asNumber(row.displayOrder),
      countsAsWin: row.countsAsWin === true,
    };
  });
}

function mapSpin(row: Record<string, unknown>, replayed: boolean): SpinResponse {
  const probabilityMilli = asNumber(row.probability_snapshot);
  const configVersion = asNumber(row.config_version);
  return {
    success: true,
    drawId: asString(row.draw_id),
    prizeId: asNumber(row.prize_id),
    prizeName: asString(row.prize_name_snapshot),
    probability: formatProbability(probabilityMilli),
    probabilityMilli,
    configurationVersion: configVersion,
    color: segmentsFromSnapshot(asString(row.wheel_snapshot)).find((segment) => segment.id === asNumber(row.prize_id))
      ?.color ?? "#334155",
    countsAsWin: asNumber(row.counts_as_win_snapshot) === 1,
    landingRatio: asNumber(row.landing_ratio_bps) / 10_000,
    configVersion,
    segments: segmentsFromSnapshot(asString(row.wheel_snapshot)),
    createdAt: asString(row.created_at),
    replayed,
  };
}

export function peekSpin(drawId: string): SpinResponse | null {
  const row = getRow("SELECT * FROM spin_records WHERE draw_id = ?", [drawId]);
  return row ? mapSpin(row, true) : null;
}

export function executeSpin(drawId: string): SpinResponse {
  try {
    return withTransaction(() => {
      const existing = getRow("SELECT * FROM spin_records WHERE draw_id = ?", [drawId]);
      if (existing) return mapSpin(existing, true);

      const settings = getSettings();
      if (!settings.isEnabled) throw new ApiError(403, "转盘暂时关闭，请稍后再来");

      const prizes = listPrizeRows();
      const active = prizes.filter((prize) => prize.isActive);
      const activeTotal = active.reduce((sum, prize) => sum + prize.probability, 0);
      if (activeTotal !== PROBABILITY_SCALE) {
        throw new ApiError(503, "奖品概率尚未凑满 100%，暂时不能抽奖");
      }
      const visible = active.filter((prize) => prize.probability > 0);
      const ticket = randomIntBelow(activeTotal);
      const selected = selectByTicket(visible, ticket);
      const arcs = buildEqualArcs(visible);
      const sweep = arcs.find((arc) => arc.id === selected.id)?.sweep ?? 0;
      const landingBps = sweep < 2 ? 5000 : 1200 + randomIntBelow(7601);
      const segments = visible.map(toPublicSegment);
      const createdAt = new Date().toISOString();
      runSql(
        `INSERT INTO spin_records (
           id, draw_id, prize_id, prize_name_snapshot, probability_snapshot,
           counts_as_win_snapshot, config_version, landing_ratio_bps, wheel_snapshot, created_at
         ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          crypto.randomUUID(),
          drawId,
          selected.id,
          selected.name,
          selected.probability,
          selected.countsAsWin ? 1 : 0,
          settings.configVersion,
          landingBps,
          JSON.stringify(segments),
          createdAt,
        ],
      );
      const stored = getRow("SELECT * FROM spin_records WHERE draw_id = ?", [drawId]);
      if (!stored) throw new Error("抽奖结果没有写入");
      return mapSpin(stored, false);
    });
  } catch (error) {
    if (isUniqueConstraint(error)) {
      const existing = peekSpin(drawId);
      if (existing) return existing;
    }
    throw error;
  }
}

import { asNumber, asString, allRows, getRow } from "@/lib/db";
import { formatProbability } from "@/lib/probability";
import { getSettings } from "@/lib/prizes";
import type { SpinHistoryRow, StatsResponse } from "@/lib/types";

function mapHistory(row: Record<string, unknown>): SpinHistoryRow {
  return {
    drawId: asString(row.draw_id),
    prizeId: asNumber(row.prize_id),
    prizeName: asString(row.prize_name_snapshot),
    probability: formatProbability(asNumber(row.probability_snapshot)),
    countsAsWin: asNumber(row.counts_as_win_snapshot) === 1,
    configVersion: asNumber(row.config_version),
    createdAt: asString(row.created_at),
  };
}

export async function getStats(): Promise<StatsResponse> {
  const settings = await getSettings();
  const totalRow = await getRow("SELECT COUNT(*) AS count FROM spin_records");
  const winRow = await getRow("SELECT COUNT(*) AS count FROM spin_records WHERE counts_as_win_snapshot = 1");
  const distribution = (await allRows(
    `SELECT id, name, color, probability, is_active,
            (SELECT COUNT(*) FROM spin_records WHERE prize_id = wheel_prizes.id) AS spins
     FROM wheel_prizes
     ORDER BY display_order ASC, id ASC`,
  )).map((row) => ({
    prizeId: asNumber(row.id),
    name: asString(row.name),
    color: asString(row.color),
    probability: formatProbability(asNumber(row.probability)),
    isActive: asNumber(row.is_active) === 1,
    spins: asNumber(row.spins),
  }));
  const orphans = (await allRows(
    `SELECT prize_id, prize_name_snapshot, COUNT(*) AS spins
     FROM spin_records
     WHERE prize_id NOT IN (SELECT id FROM wheel_prizes)
     GROUP BY prize_id, prize_name_snapshot
     ORDER BY spins DESC`,
  )).map((row) => ({
    prizeId: asNumber(row.prize_id),
    name: asString(row.prize_name_snapshot),
    spins: asNumber(row.spins),
  }));
  const recent = (await allRows(
    `SELECT draw_id, prize_id, prize_name_snapshot, probability_snapshot, counts_as_win_snapshot, config_version, created_at
     FROM spin_records
     ORDER BY created_at DESC
     LIMIT 20`,
  )).map(mapHistory);

  return {
    totalSpins: totalRow ? asNumber(totalRow.count) : 0,
    totalWins: winRow ? asNumber(winRow.count) : 0,
    configVersion: settings.configVersion,
    wheelName: settings.wheelName,
    isEnabled: settings.isEnabled,
    distribution,
    orphans,
    recent,
  };
}

export async function listSpins(limit = 30): Promise<SpinHistoryRow[]> {
  const safeLimit = Math.min(100, Math.max(1, limit));
  return (await allRows(
    `SELECT draw_id, prize_id, prize_name_snapshot, probability_snapshot, counts_as_win_snapshot, config_version, created_at
     FROM spin_records
     ORDER BY created_at DESC
     LIMIT ?`,
    [safeLimit],
  )).map(mapHistory);
}

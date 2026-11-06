import { ApiError } from "@/lib/errors";
import { asNumber, asString, getRow, allRows, runSql, withTransaction } from "@/lib/db";
import {
  PROBABILITY_SCALE,
  formatProbability,
  parseProbabilityInput,
  sumActiveProbability,
} from "@/lib/probability";
import type { AdminPrize, AdminSettings, AuditRow, PublicSegment, WheelResponse } from "@/lib/types";
import type { z } from "zod";
import { savePrizesSchema, settingsSchema } from "@/lib/validation";

type PrizeRow = {
  id: number;
  name: string;
  probability: number;
  color: string;
  displayOrder: number;
  isActive: boolean;
  countsAsWin: boolean;
  createdAt: string;
  updatedAt: string;
};

function mapPrize(row: Record<string, unknown>): PrizeRow {
  return {
    id: asNumber(row.id),
    name: asString(row.name),
    probability: asNumber(row.probability),
    color: asString(row.color),
    displayOrder: asNumber(row.display_order),
    isActive: asNumber(row.is_active) === 1,
    countsAsWin: asNumber(row.counts_as_win) === 1,
    createdAt: asString(row.created_at),
    updatedAt: asString(row.updated_at),
  };
}

export async function listPrizeRows(): Promise<PrizeRow[]> {
  return (await allRows("SELECT * FROM wheel_prizes ORDER BY display_order ASC, id ASC")).map(mapPrize);
}

export function toAdminPrize(prize: PrizeRow): AdminPrize {
  return {
    id: prize.id,
    name: prize.name,
    probability: formatProbability(prize.probability),
    probabilityMilli: prize.probability,
    color: prize.color,
    displayOrder: prize.displayOrder,
    isActive: prize.isActive,
    countsAsWin: prize.countsAsWin,
    createdAt: prize.createdAt,
    updatedAt: prize.updatedAt,
  };
}

export function toPublicSegment(prize: PrizeRow): PublicSegment {
  return {
    id: prize.id,
    name: prize.name,
    color: prize.color,
    probabilityMilli: prize.probability,
    displayOrder: prize.displayOrder,
    countsAsWin: prize.countsAsWin,
  };
}

export async function visibleSegments(prizes?: PrizeRow[]): Promise<PublicSegment[]> {
  const rows = prizes ?? (await listPrizeRows());
  return rows.filter((prize) => prize.isActive && prize.probability > 0).map(toPublicSegment);
}

export async function getSettings(): Promise<AdminSettings> {
  const row = await getRow("SELECT * FROM wheel_settings WHERE id = 1");
  if (!row) throw new ApiError(500, "转盘设置不存在");
  return {
    wheelName: asString(row.wheel_name),
    isEnabled: asNumber(row.is_enabled) === 1,
    configVersion: asNumber(row.config_version),
    updatedAt: asString(row.updated_at),
  };
}

export async function getPublicWheel(): Promise<WheelResponse> {
  const settings = await getSettings();
  return {
    wheelName: settings.wheelName,
    isEnabled: settings.isEnabled,
    configVersion: settings.configVersion,
    segments: await visibleSegments(),
  };
}

type SaveInput = z.infer<typeof savePrizesSchema>;

export async function savePrizes(
  adminId: string,
  input: SaveInput,
): Promise<{ prizes: AdminPrize[]; configVersion: number; unchanged: boolean }> {
  const parsedRows = input.prizes.map((prize) => {
    const probability = parseProbabilityInput(prize.probability);
    if (probability === null) throw new ApiError(400, `「${prize.name}」的概率无效，请输入 0 到 100 之间、最多 3 位小数的数字`);
    return { ...prize, probability };
  });
  const summary = sumActiveProbability(
    parsedRows.map((prize) => ({ probability: formatProbability(prize.probability), isActive: prize.isActive })),
  );
  if (summary.invalidRows > 0 || summary.total !== PROBABILITY_SCALE) {
    throw new ApiError(
      400,
      `启用奖品的概率合计必须正好等于 100%，当前是 ${formatProbability(summary.total)}%`,
    );
  }

  return withTransaction(async () => {
    const existing = await listPrizeRows();
    const existingIds = new Set(existing.map((prize) => prize.id));
    const seen = new Set<number>();
    for (const prize of parsedRows) {
      if (prize.id === null) continue;
      if (!existingIds.has(prize.id)) throw new ApiError(400, "包含不存在的奖品，请刷新后重试");
      if (seen.has(prize.id)) throw new ApiError(400, "奖品编号重复");
      seen.add(prize.id);
    }
    const missing = existing.filter((prize) => !seen.has(prize.id)).map((prize) => prize.id);
    const deleteIds = [...new Set(input.deleteIds)];
    if (missing.length !== deleteIds.length || missing.some((id) => !deleteIds.includes(id))) {
      throw new ApiError(400, "删除列表和奖品列表不一致，请刷新后重试");
    }

    const nextSignature = JSON.stringify(
      parsedRows.map((prize, index) => ({
        id: prize.id,
        name: prize.name,
        probability: prize.probability,
        color: prize.color.toLowerCase(),
        displayOrder: index + 1,
        isActive: prize.isActive,
        countsAsWin: prize.countsAsWin,
      })),
    );
    const currentSignature = JSON.stringify(
      existing.map((prize) => ({
        id: prize.id,
        name: prize.name,
        probability: prize.probability,
        color: prize.color.toLowerCase(),
        displayOrder: prize.displayOrder,
        isActive: prize.isActive,
        countsAsWin: prize.countsAsWin,
      })),
    );
    if (nextSignature === currentSignature) {
      return { prizes: existing.map(toAdminPrize), configVersion: (await getSettings()).configVersion, unchanged: true };
    }

    const now = new Date().toISOString();
    const byId = new Map(existing.map((prize) => [prize.id, prize]));
    for (const id of deleteIds) {
      const previous = byId.get(id);
      if (previous && previous.probability !== 0) {
        await writeAudit(adminId, id, previous.probability, 0, now);
      }
      await runSql("DELETE FROM wheel_prizes WHERE id = ?", [id]);
    }
    for (let index = 0; index < parsedRows.length; index += 1) {
      const prize = parsedRows[index];
      if (!prize) continue;
      const order = index + 1;
      if (prize.id === null) {
        const inserted = await runSql(
          `INSERT INTO wheel_prizes
            (name, probability, color, display_order, is_active, counts_as_win, created_at, updated_at)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
          [
            prize.name,
            prize.probability,
            prize.color,
            order,
            prize.isActive ? 1 : 0,
            prize.countsAsWin ? 1 : 0,
            now,
            now,
          ],
        );
        if (prize.probability !== 0) await writeAudit(adminId, inserted.lastInsertRowid, 0, prize.probability, now);
        continue;
      }
      const previous = byId.get(prize.id);
      if (!previous) throw new ApiError(400, "包含不存在的奖品，请刷新后重试");
      if (previous.probability !== prize.probability) {
        await writeAudit(adminId, prize.id, previous.probability, prize.probability, now);
      }
      await runSql(
        `UPDATE wheel_prizes
         SET name = ?, probability = ?, color = ?, display_order = ?, is_active = ?, counts_as_win = ?, updated_at = ?
         WHERE id = ?`,
        [
          prize.name,
          prize.probability,
          prize.color,
          order,
          prize.isActive ? 1 : 0,
          prize.countsAsWin ? 1 : 0,
          now,
          prize.id,
        ],
      );
    }
    await runSql("UPDATE wheel_settings SET config_version = config_version + 1, updated_at = ? WHERE id = 1", [now]);
    return { prizes: (await listPrizeRows()).map(toAdminPrize), configVersion: (await getSettings()).configVersion, unchanged: false };
  });
}

async function writeAudit(adminId: string, prizeId: number, oldProbability: number, newProbability: number, now: string): Promise<void> {
  await runSql(
    `INSERT INTO probability_audit_logs
      (id, admin_id, prize_id, old_probability, new_probability, created_at)
     VALUES (?, ?, ?, ?, ?, ?)`,
    [crypto.randomUUID(), adminId, prizeId, oldProbability, newProbability, now],
  );
}

export async function updateSettings(input: { wheelName: string; isEnabled: boolean }): Promise<AdminSettings> {
  const parsed = settingsSchema.parse(input);
  await runSql("UPDATE wheel_settings SET wheel_name = ?, is_enabled = ?, updated_at = ? WHERE id = 1", [
    parsed.wheelName,
    parsed.isEnabled ? 1 : 0,
    new Date().toISOString(),
  ]);
  return getSettings();
}

export async function listAudit(limit = 50): Promise<AuditRow[]> {
  const safeLimit = Math.min(100, Math.max(1, limit));
  return (await allRows(
    `SELECT logs.id, logs.admin_id, admins.username AS admin_username, logs.prize_id,
            logs.old_probability, logs.new_probability, logs.created_at
     FROM probability_audit_logs logs
     JOIN admins ON admins.id = logs.admin_id
     ORDER BY logs.created_at DESC
     LIMIT ?`,
    [safeLimit],
  )).map((row) => ({
    id: asString(row.id),
    adminId: asString(row.admin_id),
    adminUsername: asString(row.admin_username),
    prizeId: row.prize_id === null ? null : asNumber(row.prize_id),
    oldProbability: formatProbability(asNumber(row.old_probability)),
    newProbability: formatProbability(asNumber(row.new_probability)),
    createdAt: asString(row.created_at),
  }));
}

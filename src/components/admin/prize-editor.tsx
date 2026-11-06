"use client";

import { useEffect, useMemo, useState } from "react";
import { useAdmin } from "@/components/admin/admin-provider";
import { requestJson } from "@/lib/client-api";
import { formatProbability, probabilityError, sumActiveProbability } from "@/lib/probability";
import type { AdminPrize } from "@/lib/types";

type Draft = {
  key: string;
  id: number | null;
  name: string;
  probability: string;
  color: string;
  isActive: boolean;
  countsAsWin: boolean;
};

const palette = ["#D4A017", "#6D28D9", "#047857", "#E11D48", "#0369A1", "#C026D3", "#334155", "#0F766E"];

function toDraft(prize: AdminPrize): Draft {
  return {
    key: String(prize.id),
    id: prize.id,
    name: prize.name,
    probability: prize.probability,
    color: prize.color.toLowerCase(),
    isActive: prize.isActive,
    countsAsWin: prize.countsAsWin,
  };
}

export function PrizeEditor() {
  const admin = useAdmin();
  const [drafts, setDrafts] = useState<Draft[]>([]);
  const [deleteIds, setDeleteIds] = useState<number[]>([]);
  const [version, setVersion] = useState<number | null>(null);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [pending, setPending] = useState(false);

  useEffect(() => {
    requestJson<{ prizes: AdminPrize[]; configVersion: number }>("/api/admin/prizes")
      .then((data) => {
        setDrafts(data.prizes.map(toDraft));
        setVersion(data.configVersion);
      })
      .catch((reason: unknown) => setError(reason instanceof Error ? reason.message : "加载失败"));
  }, []);

  const summary = useMemo(() => sumActiveProbability(drafts), [drafts]);
  const exact = summary.invalidRows === 0 && summary.total === 100_000;

  function update(key: string, patch: Partial<Draft>) {
    setDrafts((current) => current.map((item) => (item.key === key ? { ...item, ...patch } : item)));
  }

  function move(index: number, direction: -1 | 1) {
    setDrafts((current) => {
      const next = [...current];
      const target = index + direction;
      const row = next[index];
      const other = next[target];
      if (!row || !other) return current;
      next[index] = other;
      next[target] = row;
      return next;
    });
  }

  function addPrize() {
    setDrafts((current) => [
      ...current,
      {
        key: crypto.randomUUID(),
        id: null,
        name: "新奖品",
        probability: "0",
        color: palette[current.length % palette.length] ?? "#334155",
        isActive: true,
        countsAsWin: true,
      },
    ]);
  }

  function removePrize(prize: Draft) {
    if (drafts.length === 1) return;
    if (prize.id !== null) {
      const id = prize.id;
      setDeleteIds((current) => [...current, id]);
    }
    setDrafts((current) => current.filter((item) => item.key !== prize.key));
  }

  async function save() {
    setPending(true);
    setError("");
    setNotice("");
    try {
      const saved = await requestJson<{ prizes: AdminPrize[]; configVersion: number; unchanged: boolean }>(
        "/api/admin/prizes",
        {
          method: "PUT",
          csrf: admin.csrfToken,
          body: {
            deleteIds,
            prizes: drafts.map((prize) => ({
              id: prize.id,
              name: prize.name,
              probability: prize.probability,
              color: prize.color,
              isActive: prize.isActive,
              countsAsWin: prize.countsAsWin,
            })),
          },
        },
      );
      setDrafts(saved.prizes.map(toDraft));
      setDeleteIds([]);
      setVersion(saved.configVersion);
      setNotice(saved.unchanged ? "没有变化。" : "已保存，下一次抽奖会立即使用新概率。");
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "保存失败");
    } finally {
      setPending(false);
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="font-[family-name:var(--font-display)] text-3xl">奖品与概率</h1>
          <p className="mt-1 text-sm text-[#6f6256]">直接填写百分比。启用奖品合计必须正好是 100%，系统不会自动改你的数字。</p>
        </div>
        <button type="button" onClick={addPrize} className="rounded-full border border-[#d9c8b0] bg-white px-4 py-2 text-sm">
          添加奖品
        </button>
      </div>
      {error ? <p className="text-sm text-[#b42318]">{error}</p> : null}
      {notice ? <p className="text-sm text-[#067647]">{notice}</p> : null}
      <div className="space-y-3">
        {drafts.map((prize, index) => {
          const rowError = probabilityError(prize.probability);
          return (
            <article key={prize.key} className={`rounded-3xl bg-white p-4 ${prize.isActive ? "" : "opacity-70"}`}>
              <div className="flex flex-wrap items-center gap-2">
                <button type="button" disabled={index === 0} onClick={() => move(index, -1)} className="rounded-full border px-3 py-1 text-sm">
                  上移
                </button>
                <button
                  type="button"
                  disabled={index === drafts.length - 1}
                  onClick={() => move(index, 1)}
                  className="rounded-full border px-3 py-1 text-sm"
                >
                  下移
                </button>
                <input
                  type="color"
                  value={prize.color}
                  onChange={(event) => update(prize.key, { color: event.target.value })}
                  aria-label={`${prize.name}的颜色`}
                  className="h-9 w-12 border-0 bg-transparent"
                />
                <label className="ml-auto flex items-center gap-2 text-sm">
                  <input
                    type="checkbox"
                    checked={prize.isActive}
                    onChange={(event) => update(prize.key, { isActive: event.target.checked })}
                  />
                  启用
                </label>
                <button type="button" onClick={() => removePrize(prize)} className="text-sm text-[#b42318]">
                  删除
                </button>
              </div>
              <div className="mt-3 grid gap-3 sm:grid-cols-[1fr_160px]">
                <label className="text-sm">
                  奖品名称
                  <input
                    value={prize.name}
                    onChange={(event) => update(prize.key, { name: event.target.value })}
                    className="mt-1 w-full rounded-2xl border border-[#eadfce] px-3 py-2"
                  />
                </label>
                <label className="text-sm">
                  概率 %
                  <input
                    value={prize.probability}
                    onChange={(event) => update(prize.key, { probability: event.target.value })}
                    inputMode="decimal"
                    aria-invalid={rowError ? true : undefined}
                    className="mt-1 w-full rounded-2xl border border-[#eadfce] px-3 py-2"
                  />
                </label>
              </div>
              <label className="mt-3 flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={prize.countsAsWin}
                  onChange={(event) => update(prize.key, { countsAsWin: event.target.checked })}
                />
                计入中奖（谢谢惠顾请取消勾选）
              </label>
              {rowError ? <p className="mt-2 text-sm text-[#b42318]">{rowError}</p> : null}
              {!prize.isActive ? <p className="mt-2 text-xs text-[#8d7b6b]">停用的奖品不参与合计，也不会被抽中。</p> : null}
            </article>
          );
        })}
      </div>
      <div className="sticky bottom-3 flex flex-wrap items-center justify-between gap-3 rounded-3xl border border-[#eadfce] bg-[#fffaf4] px-4 py-3 shadow-lg">
        <div>
          <p className={`text-lg ${exact ? "text-[#067647]" : "text-[#b42318]"}`}>
            当前合计 {summary.invalidRows ? `${formatProbability(summary.total)}%（有无效输入）` : `${formatProbability(summary.total)}%`}
          </p>
          {!exact ? <p className="text-sm text-[#b42318]">启用奖品的概率合计必须正好等于 100% 才能保存。</p> : null}
          {version !== null ? <p className="text-xs text-[#8d7b6b]">当前配置版本 {version}</p> : null}
        </div>
        <button
          type="button"
          disabled={!exact || pending}
          onClick={() => void save()}
          className="rounded-full bg-[#1c140c] px-5 py-3 text-sm text-[#fff8ef] disabled:opacity-40"
        >
          {pending ? "保存中…" : "保存概率"}
        </button>
      </div>
    </div>
  );
}

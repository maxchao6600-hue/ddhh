"use client";

import { useEffect, useState } from "react";
import { requestJson } from "@/lib/client-api";
import { formatTime } from "@/lib/format";
import type { AdminSettings, StatsResponse } from "@/lib/types";
import { useAdmin } from "@/components/admin/admin-provider";

export function Dashboard() {
  const admin = useAdmin();
  const [stats, setStats] = useState<StatsResponse | null>(null);
  const [wheelName, setWheelName] = useState("");
  const [enabled, setEnabled] = useState(true);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  useEffect(() => {
    requestJson<StatsResponse>("/api/admin/stats")
      .then((data) => {
        setStats(data);
        setWheelName(data.wheelName);
        setEnabled(data.isEnabled);
      })
      .catch((reason: unknown) => setError(reason instanceof Error ? reason.message : "加载失败"));
  }, []);

  async function saveSettings(event: React.FormEvent) {
    event.preventDefault();
    setError("");
    setNotice("");
    try {
      const saved = await requestJson<AdminSettings>("/api/admin/settings", {
        method: "PATCH",
        csrf: admin.csrfToken,
        body: { wheelName, isEnabled: enabled },
      });
      setNotice("转盘设置已生效。");
      setStats((current) =>
        current ? { ...current, wheelName: saved.wheelName, isEnabled: saved.isEnabled } : current,
      );
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "保存失败");
    }
  }

  const maxSpins = Math.max(1, ...(stats?.distribution.map((row) => row.spins) ?? [1]));

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-[family-name:var(--font-display)] text-3xl">概览</h1>
        <p className="mt-1 text-sm text-[#6f6256]">配置版本 {stats?.configVersion ?? "…"}。概率保存后，下一次抽奖立即使用新配置。</p>
      </div>
      {error ? <p className="text-sm text-[#b42318]">{error}</p> : null}
      {notice ? <p className="text-sm text-[#067647]">{notice}</p> : null}
      <div className="grid gap-3 sm:grid-cols-3">
        <article className="rounded-3xl bg-white p-5">
          <p className="text-sm text-[#6f6256]">总转动次数</p>
          <p className="mt-2 text-3xl">{stats?.totalSpins ?? "—"}</p>
        </article>
        <article className="rounded-3xl bg-white p-5">
          <p className="text-sm text-[#6f6256]">中奖次数</p>
          <p className="mt-2 text-3xl">{stats?.totalWins ?? "—"}</p>
          <p className="mt-1 text-xs text-[#8d7b6b]">谢谢惠顾不计入中奖</p>
        </article>
        <article className="rounded-3xl bg-white p-5">
          <p className="text-sm text-[#6f6256]">转盘状态</p>
          <p className="mt-2 text-3xl">{stats ? (stats.isEnabled ? "开启" : "关闭") : "—"}</p>
        </article>
      </div>
      <form onSubmit={(event) => void saveSettings(event)} className="rounded-3xl bg-white p-5">
        <h2 className="text-lg">转盘设置</h2>
        <div className="mt-4 grid gap-4 sm:grid-cols-[1fr_auto] sm:items-end">
          <label className="text-sm">
            名称
            <input
              value={wheelName}
              onChange={(event) => setWheelName(event.target.value)}
              className="mt-2 w-full rounded-2xl border border-[#eadfce] px-4 py-3"
            />
          </label>
          <label className="flex items-center gap-2 pb-3 text-sm">
            <input type="checkbox" checked={enabled} onChange={(event) => setEnabled(event.target.checked)} />
            允许顾客抽奖
          </label>
        </div>
        <button type="submit" className="mt-2 rounded-full bg-[#1c140c] px-5 py-2.5 text-sm text-[#fff8ef]">
          保存设置
        </button>
      </form>
      <section className="rounded-3xl bg-white p-5">
        <h2 className="text-lg">奖品分布</h2>
        <p className="mt-1 text-xs text-[#8d7b6b]">短期次数不会刚好等于概率，这是随机抽奖的正常现象。</p>
        <div className="mt-4 space-y-3">
          {stats?.distribution.map((row) => (
            <div key={row.prizeId}>
              <div className="flex items-center justify-between gap-3 text-sm">
                <span>
                  {row.name}
                  {row.isActive ? "" : "（已停用）"}
                </span>
                <span className="text-[#6f6256]">
                  {row.probability}% · {row.spins} 次
                </span>
              </div>
              <div className="mt-1 h-2 rounded-full bg-[#f3efe8]">
                <div
                  className="h-2 rounded-full"
                  style={{ width: `${(row.spins / maxSpins) * 100}%`, background: row.color }}
                />
              </div>
            </div>
          ))}
        </div>
        {stats?.orphans.length ? (
          <div className="mt-4 text-sm text-[#6f6256]">
            {stats.orphans.map((row) => (
              <p key={`${row.prizeId}-${row.name}`}>
                已删除奖品 {row.name}：{row.spins} 次
              </p>
            ))}
          </div>
        ) : null}
      </section>
      <section className="rounded-3xl bg-white p-5">
        <h2 className="text-lg">最近抽奖</h2>
        <div className="mt-4 overflow-x-auto">
          <table className="w-full min-w-[640px] text-left text-sm">
            <thead className="text-[#6f6256]">
              <tr>
                <th className="py-2 font-medium">时间</th>
                <th className="py-2 font-medium">奖品</th>
                <th className="py-2 font-medium">当时概率</th>
                <th className="py-2 font-medium">配置版本</th>
              </tr>
            </thead>
            <tbody>
              {stats?.recent.map((row) => (
                <tr key={row.drawId} className="border-t border-[#f0e6d8]">
                  <td className="py-2">{formatTime(row.createdAt)}</td>
                  <td className="py-2">{row.prizeName}</td>
                  <td className="py-2">{row.probability}%</td>
                  <td className="py-2">{row.configVersion}</td>
                </tr>
              ))}
              {stats && stats.recent.length === 0 ? (
                <tr>
                  <td className="py-4 text-[#8d7b6b]" colSpan={4}>
                    还没有抽奖记录。
                  </td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}

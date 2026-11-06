"use client";

import { useEffect, useState } from "react";
import { requestJson } from "@/lib/client-api";
import { formatTime } from "@/lib/format";
import type { AuditRow } from "@/lib/types";

export function AuditLog() {
  const [logs, setLogs] = useState<AuditRow[]>([]);
  const [error, setError] = useState("");

  useEffect(() => {
    requestJson<{ logs: AuditRow[] }>("/api/admin/audit")
      .then((data) => setLogs(data.logs))
      .catch((reason: unknown) => setError(reason instanceof Error ? reason.message : "加载失败"));
  }, []);

  return (
    <div>
      <h1 className="font-[family-name:var(--font-display)] text-3xl">概率审计</h1>
      <p className="mt-1 text-sm text-[#6f6256]">每次概率变化都会留下旧值、新值、管理员和时间。</p>
      {error ? <p className="mt-4 text-sm text-[#b42318]">{error}</p> : null}
      <div className="mt-5 overflow-x-auto rounded-3xl bg-white">
        <table className="w-full min-w-[720px] text-left text-sm">
          <thead className="text-[#6f6256]">
            <tr>
              <th className="px-4 py-3 font-medium">时间</th>
              <th className="px-4 py-3 font-medium">管理员</th>
              <th className="px-4 py-3 font-medium">奖品编号</th>
              <th className="px-4 py-3 font-medium">旧概率</th>
              <th className="px-4 py-3 font-medium">新概率</th>
            </tr>
          </thead>
          <tbody>
            {logs.map((log) => (
              <tr key={log.id} className="border-t border-[#f0e6d8]">
                <td className="px-4 py-3">{formatTime(log.createdAt)}</td>
                <td className="px-4 py-3">{log.adminUsername}</td>
                <td className="px-4 py-3">{log.prizeId ?? "已删除"}</td>
                <td className="px-4 py-3">{log.oldProbability}%</td>
                <td className="px-4 py-3">{log.newProbability}%</td>
              </tr>
            ))}
            {logs.length === 0 ? (
              <tr>
                <td className="px-4 py-6 text-[#8d7b6b]" colSpan={5}>
                  还没有概率变更。
                </td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </div>
    </div>
  );
}

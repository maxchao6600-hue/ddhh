"use client";

import { useState } from "react";
import { useAdmin } from "@/components/admin/admin-provider";
import { requestJson } from "@/lib/client-api";

export function SecurityPanel() {
  const admin = useAdmin();
  const [setup, setSetup] = useState<{ qrDataUrl: string; secret: string } | null>(null);
  const [code, setCode] = useState("");
  const [password, setPassword] = useState("");
  const [disableCode, setDisableCode] = useState("");
  const [enabled, setEnabled] = useState(admin.totpEnabled);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  async function generate() {
    setError("");
    setNotice("");
    try {
      const data = await requestJson<{ qrDataUrl: string; secret: string }>("/api/admin/totp/setup", {
        method: "POST",
        csrf: admin.csrfToken,
      });
      setSetup(data);
      setEnabled(false);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "无法生成密钥");
    }
  }

  async function enable(event: React.FormEvent) {
    event.preventDefault();
    setError("");
    try {
      await requestJson("/api/admin/totp/enable", {
        method: "POST",
        csrf: admin.csrfToken,
        body: { code },
      });
      setEnabled(true);
      setSetup(null);
      setNotice("两步验证已开启。下次登录需要验证码。");
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "开启失败");
    }
  }

  async function disable(event: React.FormEvent) {
    event.preventDefault();
    setError("");
    try {
      await requestJson("/api/admin/totp/disable", {
        method: "POST",
        csrf: admin.csrfToken,
        body: { password, code: disableCode },
      });
      setEnabled(false);
      setNotice("两步验证已关闭。");
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "关闭失败");
    }
  }

  return (
    <div className="max-w-xl space-y-5">
      <div>
        <h1 className="font-[family-name:var(--font-display)] text-3xl">安全设置</h1>
        <p className="mt-1 text-sm text-[#6f6256]">可选的验证器两步验证。密钥只在生成时显示一次。</p>
      </div>
      {error ? <p className="text-sm text-[#b42318]">{error}</p> : null}
      {notice ? <p className="text-sm text-[#067647]">{notice}</p> : null}
      <section className="rounded-3xl bg-white p-5">
        <p className="text-sm">当前状态：{enabled ? "已开启" : "未开启"}</p>
        <button type="button" onClick={() => void generate()} className="mt-4 rounded-full bg-[#1c140c] px-4 py-2 text-sm text-[#fff8ef]">
          生成新的验证器密钥
        </button>
        {setup ? (
          <form onSubmit={(event) => void enable(event)} className="mt-4">
            <div
              role="img"
              aria-label="验证器二维码"
              className="h-48 w-48 rounded-2xl bg-white bg-contain bg-center bg-no-repeat"
              style={
                setup.qrDataUrl.startsWith("data:image/")
                  ? { backgroundImage: `url("${setup.qrDataUrl}")` }
                  : undefined
              }
            />
            <p className="mt-3 break-all font-mono text-xs">{setup.secret}</p>
            <label className="mt-3 block text-sm">
              6 位验证码
              <input
                value={code}
                onChange={(event) => setCode(event.target.value)}
                inputMode="numeric"
                className="mt-1 w-full rounded-2xl border border-[#eadfce] px-3 py-2"
              />
            </label>
            <button type="submit" className="mt-3 rounded-full border px-4 py-2 text-sm">
              确认开启
            </button>
          </form>
        ) : null}
      </section>
      {enabled ? (
        <form onSubmit={(event) => void disable(event)} className="rounded-3xl bg-white p-5">
          <h2 className="text-lg">关闭两步验证</h2>
          <label className="mt-3 block text-sm">
            当前密码
            <input
              type="password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              className="mt-1 w-full rounded-2xl border border-[#eadfce] px-3 py-2"
            />
          </label>
          <label className="mt-3 block text-sm">
            验证码
            <input
              value={disableCode}
              onChange={(event) => setDisableCode(event.target.value)}
              inputMode="numeric"
              className="mt-1 w-full rounded-2xl border border-[#eadfce] px-3 py-2"
            />
          </label>
          <button type="submit" className="mt-4 rounded-full border border-[#b42318] px-4 py-2 text-sm text-[#b42318]">
            关闭
          </button>
        </form>
      ) : null}
    </div>
  );
}

"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { requestJson } from "@/lib/client-api";

export function LoginForm({ created }: { created: boolean }) {
  const router = useRouter();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [code, setCode] = useState("");
  const [challengeId, setChallengeId] = useState("");
  const [error, setError] = useState("");
  const [pending, setPending] = useState(false);

  async function onSubmit(event: React.FormEvent) {
    event.preventDefault();
    setPending(true);
    setError("");
    try {
      if (challengeId) {
        await requestJson("/api/admin/login/totp", {
          method: "POST",
          body: { challengeId, code },
        });
      } else {
        const result = await requestJson<{ totpRequired?: boolean; challengeId?: string }>("/api/admin/login", {
          method: "POST",
          body: { username, password },
        });
        if (result.totpRequired && result.challengeId) {
          setChallengeId(result.challengeId);
          setPending(false);
          return;
        }
      }
      router.replace("/admin");
      router.refresh();
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "登录失败");
    } finally {
      setPending(false);
    }
  }

  return (
    <main className="flex min-h-dvh items-center justify-center bg-[#f3efe8] px-4">
      <form onSubmit={(event) => void onSubmit(event)} className="w-full max-w-md rounded-3xl bg-white p-6 shadow-sm sm:p-8">
        <p className="text-xs tracking-[0.22em] text-[#9a6b32]">ADMIN</p>
        <h1 className="mt-2 font-[family-name:var(--font-display)] text-3xl">店主登录</h1>
        {created ? <p className="mt-3 text-sm text-[#067647]">管理员已创建，请登录。</p> : null}
        {challengeId ? (
          <label className="mt-6 block text-sm">
            验证码
            <input
              value={code}
              onChange={(event) => setCode(event.target.value)}
              inputMode="numeric"
              autoComplete="one-time-code"
              className="mt-2 w-full rounded-2xl border border-[#eadfce] px-4 py-3 tracking-[0.3em]"
            />
          </label>
        ) : (
          <>
            <label className="mt-6 block text-sm">
              用户名
              <input
                value={username}
                onChange={(event) => setUsername(event.target.value)}
                autoComplete="username"
                className="mt-2 w-full rounded-2xl border border-[#eadfce] px-4 py-3"
              />
            </label>
            <label className="mt-4 block text-sm">
              密码
              <input
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                type="password"
                autoComplete="current-password"
                className="mt-2 w-full rounded-2xl border border-[#eadfce] px-4 py-3"
              />
            </label>
          </>
        )}
        {error ? <p className="mt-4 text-sm text-[#b42318]">{error}</p> : null}
        <button
          type="submit"
          disabled={pending}
          className="mt-6 w-full rounded-full bg-[#1c140c] py-3 text-[#fff8ef] disabled:opacity-60"
        >
          {pending ? "请稍候…" : challengeId ? "验证并登录" : "登录"}
        </button>
        <a href="/admin/setup" className="mt-4 block text-center text-sm text-[#8a6230]">
          首次使用？初始化管理员
        </a>
      </form>
    </main>
  );
}

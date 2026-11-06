"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { requestJson } from "@/lib/client-api";

export function SetupForm() {
  const router = useRouter();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [needsSetup, setNeedsSetup] = useState<boolean | null>(null);
  const [error, setError] = useState("");
  const [pending, setPending] = useState(false);

  useEffect(() => {
    requestJson<{ needsSetup: boolean }>("/api/setup")
      .then((data) => setNeedsSetup(data.needsSetup))
      .catch((reason: unknown) => setError(reason instanceof Error ? reason.message : "无法检查初始化状态"));
  }, []);

  async function onSubmit(event: React.FormEvent) {
    event.preventDefault();
    setPending(true);
    setError("");
    try {
      await requestJson("/api/setup", { method: "POST", body: { username, password } });
      router.replace("/admin/login?created=1");
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "初始化失败");
    } finally {
      setPending(false);
    }
  }

  return (
    <main className="flex min-h-dvh items-center justify-center bg-[#f3efe8] px-4 py-10">
      <form onSubmit={(event) => void onSubmit(event)} className="w-full max-w-md rounded-3xl bg-white p-6 shadow-sm sm:p-8">
        <h1 className="font-[family-name:var(--font-display)] text-3xl">初始化店主账号</h1>
        <p className="mt-3 text-sm leading-6 text-[#6f6256]">
          这里只会创建一次管理员，没有公开注册。网站对外开放之前，请先完成这一步，或在服务器上运行 npm run admin:create。
        </p>
        {needsSetup === false ? (
          <p className="mt-4 text-sm text-[#8a6230]">
            管理员已经存在。请前往 <a className="underline" href="/admin/login">登录</a>。
          </p>
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
                autoComplete="new-password"
                className="mt-2 w-full rounded-2xl border border-[#eadfce] px-4 py-3"
              />
            </label>
            <p className="mt-2 text-xs text-[#8d7b6b]">至少 12 位，并包含字母和数字。</p>
            {error ? <p className="mt-4 text-sm text-[#b42318]">{error}</p> : null}
            <button
              type="submit"
              disabled={pending || needsSetup === null}
              className="mt-6 w-full rounded-full bg-[#1c140c] py-3 text-[#fff8ef] disabled:opacity-60"
            >
              {pending ? "正在创建…" : "创建管理员"}
            </button>
          </>
        )}
      </form>
    </main>
  );
}

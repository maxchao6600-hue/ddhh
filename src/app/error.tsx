"use client";

export default function GlobalError({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <main className="flex min-h-dvh flex-col items-center justify-center gap-4 bg-[#f6f1e8] px-6 text-center">
      <h1 className="font-[family-name:var(--font-display)] text-3xl">页面出错了</h1>
      <button type="button" onClick={reset} className="rounded-full bg-[#1c140c] px-5 py-3 text-[#fff8ef]">
        重试
      </button>
    </main>
  );
}

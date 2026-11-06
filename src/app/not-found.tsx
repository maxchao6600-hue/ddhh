import Link from "next/link";

export default function NotFound() {
  return (
    <main className="flex min-h-dvh flex-col items-center justify-center gap-3 bg-[#140c22] text-[#fff8ef]">
      <h1 className="font-[family-name:var(--font-fun)] text-4xl">没有这一页</h1>
      <Link href="/" className="text-[#f3d48a] underline">
        回到转盘
      </Link>
    </main>
  );
}

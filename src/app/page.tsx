import { WheelExperience } from "@/components/wheel/wheel-experience";

export default function HomePage() {
  return (
    <main className="relative min-h-dvh overflow-hidden bg-[#140c22] text-[#fff8ef]">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_15%_10%,rgba(255,196,87,0.38),transparent_28%),radial-gradient(circle_at_90%_0%,rgba(255,92,138,0.28),transparent_26%),radial-gradient(circle_at_50%_100%,rgba(72,136,255,0.28),transparent_34%)]" />
      <span className="bead-float absolute left-[8%] top-[18%] h-5 w-5 rounded-full bg-[#ff5d73] shadow-[inset_-3px_-3px_0_rgba(0,0,0,0.15)]" />
      <span className="bead-float absolute right-[10%] top-[22%] h-7 w-7 rounded-full bg-[#49c2ff] shadow-[inset_-4px_-4px_0_rgba(0,0,0,0.15)] [animation-delay:-2s]" />
      <span className="bead-float absolute bottom-[12%] left-[14%] h-6 w-6 rounded-full bg-[#ffd15c] shadow-[inset_-3px_-3px_0_rgba(0,0,0,0.15)] [animation-delay:-3s]" />
      <span className="bead-float absolute right-[18%] bottom-[16%] h-4 w-4 rounded-full bg-[#7d6bff] [animation-delay:-1s]" />
      <div className="relative mx-auto flex min-h-dvh w-full max-w-6xl flex-col items-center px-4 py-8 sm:px-6 md:py-12">
        <header className="mb-6 text-center md:mb-8">
          <p className="text-sm tracking-[0.35em] text-[#f3d48a]">BEAD STUDIO</p>
          <h1 className="mt-2 font-[family-name:var(--font-fun)] text-4xl text-[#fff8ef] sm:text-5xl md:text-6xl">
            拼豆幸运转盘
          </h1>
          <p className="mt-3 text-sm text-[#f6e7c8]/80 sm:text-base">每一颗拼豆，都是一份好运</p>
        </header>
        <WheelExperience />
        <footer className="mt-8 flex w-full max-w-xl flex-col items-center gap-2 pb-4 text-center text-xs text-[#f6e7c8]/70 sm:text-sm">
          <p>奖品由服务器即时抽取，转盘只负责转到抽中的位置。</p>
          <a className="underline decoration-[#f3d48a]/50 underline-offset-4 hover:text-[#f3d48a]" href="/admin">
            店主入口
          </a>
        </footer>
      </div>
    </main>
  );
}

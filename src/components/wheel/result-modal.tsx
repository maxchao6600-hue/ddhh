"use client";

import { useEffect, useRef } from "react";
import type { SpinResponse } from "@/lib/types";

function Confetti() {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const context = canvas.getContext("2d");
    if (!context) return;
    const parent = canvas.parentElement;
    if (!parent) return;
    const rect = parent.getBoundingClientRect();
    canvas.width = rect.width;
    canvas.height = rect.height;
    let seed = Date.now() % 1_000_000;
    const next = () => {
      seed = (seed + 0x6d2b79f5) | 0;
      let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
    const colors = ["#ffd15c", "#ff5d73", "#49c2ff", "#7d6bff", "#67e08a", "#fff8ef"];
    const pieces = Array.from({ length: 90 }, () => ({
      x: next() * canvas.width,
      y: -20 - next() * canvas.height,
      r: 3 + next() * 5,
      color: colors[Math.floor(next() * colors.length)] ?? "#fff",
      vy: 1.6 + next() * 2.8,
      vx: -1.2 + next() * 2.4,
      rot: next() * Math.PI,
      spin: -0.12 + next() * 0.24,
    }));
    let frame = 0;
    const draw = () => {
      context.clearRect(0, 0, canvas.width, canvas.height);
      for (const piece of pieces) {
        piece.y += piece.vy;
        piece.x += piece.vx;
        piece.rot += piece.spin;
        context.save();
        context.translate(piece.x, piece.y);
        context.rotate(piece.rot);
        context.fillStyle = piece.color;
        context.fillRect(-piece.r, -piece.r / 2, piece.r * 2, piece.r);
        context.restore();
      }
      frame = requestAnimationFrame(draw);
    };
    frame = requestAnimationFrame(draw);
    return () => cancelAnimationFrame(frame);
  }, []);

  return <canvas ref={canvasRef} className="pointer-events-none absolute inset-0 h-full w-full" />;
}

export function ResultModal({
  result,
  onClose,
  onAgain,
}: {
  result: SpinResponse;
  onClose: () => void;
  onAgain: () => void;
}) {
  const closeRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    closeRef.current?.focus();
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  return (
    <div className="fixed inset-0 z-40 flex items-end justify-center bg-[#120a1c]/70 p-4 sm:items-center" role="presentation">
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="spin-result-title"
        className="modal-pop relative w-full max-w-md overflow-hidden rounded-[28px] bg-[#fff8ef] p-6 text-[#1c140c] shadow-2xl sm:p-8"
      >
        {result.countsAsWin ? <Confetti /> : null}
        <div className="relative">
          <div
            className="mx-auto mb-4 h-16 w-16 rounded-full shadow-[inset_-6px_-6px_0_rgba(0,0,0,0.12)]"
            style={{ background: result.color }}
          />
          <p className="text-center text-sm tracking-[0.2em] text-[#8a6230]">
            {result.countsAsWin ? "恭喜获得" : "这次的结果"}
          </p>
          <h2 id="spin-result-title" className="mt-2 text-center font-[family-name:var(--font-fun)] text-4xl">
            {result.prizeName}
          </h2>
          <p className="mt-3 text-center text-sm text-[#6d5b4b]">
            {result.countsAsWin ? "把这个结果出示给店主即可兑换。" : "谢谢参与，下次好运。"}
          </p>
          <p className="mt-4 break-all text-center font-mono text-xs text-[#8d7b6b]">抽奖编号 {result.drawId}</p>
          <div className="mt-6 grid grid-cols-2 gap-3">
            <button
              ref={closeRef}
              type="button"
              className="rounded-full border border-[#e4d3bc] px-4 py-3 text-sm"
              onClick={onClose}
            >
              关闭
            </button>
            <button
              type="button"
              className="rounded-full bg-[#1c140c] px-4 py-3 text-sm text-[#fff8ef]"
              onClick={onAgain}
            >
              再转一次
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

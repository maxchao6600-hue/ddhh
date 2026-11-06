"use client";

import { useEffect, useRef, useState } from "react";
import { requestJson } from "@/lib/client-api";
import type { SpinResponse, WheelResponse } from "@/lib/types";
import { arcPath, buildEqualArcs, inkFor, nextWheelRotation, polar, prizeAtPointer } from "@/lib/wheel-geometry";
import { ResultModal } from "@/components/wheel/result-modal";

function useReducedMotion(): boolean {
  const [reduced, setReduced] = useState(false);
  useEffect(() => {
    const media = window.matchMedia("(prefers-reduced-motion: reduce)");
    const update = () => setReduced(media.matches);
    update();
    media.addEventListener("change", update);
    return () => media.removeEventListener("change", update);
  }, []);
  return reduced;
}

export function WheelExperience() {
  const [wheel, setWheel] = useState<WheelResponse | null>(null);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [rotation, setRotation] = useState(0);
  const [alignedPrize, setAlignedPrize] = useState<number | null>(null);
  const [result, setResult] = useState<SpinResponse | null>(null);
  const rotationRef = useRef(0);
  const pendingDraw = useRef<string | null>(null);
  const frameRef = useRef(0);
  const mounted = useRef(true);
  const reducedMotion = useReducedMotion();

  useEffect(() => {
    mounted.current = true;
    requestJson<WheelResponse>("/api/wheel")
      .then((data) => {
        if (mounted.current) {
          setWheel(data);
          document.title = data.wheelName;
        }
      })
      .catch((reason: unknown) => {
        if (mounted.current) setError(reason instanceof Error ? reason.message : "转盘加载失败");
      });
    return () => {
      mounted.current = false;
      cancelAnimationFrame(frameRef.current);
    };
  }, []);

  const segments = wheel?.segments ?? [];
  const arcs = buildEqualArcs(segments);

  async function spinAgain() {
    setResult(null);
    await spin();
  }

  async function spin() {
    if (busy || !wheel?.isEnabled) return;
    setBusy(true);
    setError("");
    setResult(null);
    const drawId = pendingDraw.current ?? crypto.randomUUID();
    pendingDraw.current = drawId;
    try {
      const outcome = await requestJson<SpinResponse>("/api/spin", {
        method: "POST",
        body: { drawId },
      });
      pendingDraw.current = null;
      if (!mounted.current) return;
      const nextArcs = buildEqualArcs(outcome.segments);
      const turns = reducedMotion ? 1 : 6;
      const duration = reducedMotion ? 700 : 5200;
      const destination = nextWheelRotation(rotationRef.current, nextArcs, outcome.prizeId, outcome.landingRatio, turns);
      setWheel((current) =>
        current
          ? {
              ...current,
              configVersion: outcome.configVersion,
              segments: outcome.segments,
              wheelName: current.wheelName,
              isEnabled: current.isEnabled,
            }
          : current,
      );
      await animateTo(destination, duration);
      if (!mounted.current) return;
      setAlignedPrize(prizeAtPointer(nextArcs, destination));
      setResult(outcome);
    } catch (reason) {
      if (mounted.current) setError(reason instanceof Error ? reason.message : "抽奖失败");
    } finally {
      if (mounted.current) setBusy(false);
    }
  }

  function animateTo(destination: number, duration: number): Promise<void> {
    const from = rotationRef.current;
    const started = performance.now();
    return new Promise((resolve) => {
      const step = (now: number) => {
        const progress = Math.min(1, (now - started) / duration);
        const eased = 1 - (1 - progress) ** 4;
        const value = from + (destination - from) * eased;
        rotationRef.current = value;
        setRotation(value);
        if (progress < 1) frameRef.current = requestAnimationFrame(step);
        else resolve();
      };
      frameRef.current = requestAnimationFrame(step);
    });
  }

  return (
    <section className="flex w-full justify-center">
      <div className="relative w-full max-w-[720px]">
        <div
          className={`absolute top-0 left-1/2 z-20 h-12 w-8 -translate-x-1/2 ${busy ? "pointer-tick" : ""}`}
          aria-hidden
        >
          <div className="mx-auto h-0 w-0 border-x-[14px] border-t-[28px] border-x-transparent border-t-[#fff4d2] drop-shadow-[0_8px_0_rgba(0,0,0,0.18)]" />
          <div className="mx-auto -mt-1 h-4 w-4 rounded-full bg-[#e6b34d] ring-4 ring-[#fff4d2]" />
        </div>
        <div
          className="relative mt-6 aspect-square"
          data-rotation={rotation.toFixed(4)}
          data-aligned-prize={alignedPrize ?? ""}
          data-prize-id={result?.prizeId ?? ""}
        >
          <div
            className="absolute inset-0 rounded-full shadow-[0_25px_60px_rgba(0,0,0,0.35)]"
            style={{ transform: `rotate(${rotation}deg)` }}
          >
            <svg viewBox="0 0 100 100" className="h-full w-full" role="img" aria-label="拼豆幸运转盘">
              <circle cx="50" cy="50" r="49" fill="#2a1840" />
              {arcs.map((arc) => {
                const segment = segments.find((item) => item.id === arc.id);
                if (!segment) return null;
                const mid = arc.start + arc.sweep / 2;
                const [x, y] = polar(50, 50, 33, mid);
                const flip = mid > 90 && mid < 270;
                const full = arc.sweep >= 359.999;
                return (
                  <g key={arc.id}>
                    {full ? (
                      <circle cx="50" cy="50" r="46" fill={segment.color} />
                    ) : (
                      <path d={arcPath(arc.start, arc.sweep)} fill={segment.color}>
                        <title>{segment.name}</title>
                      </path>
                    )}
                    <text
                        x={x}
                        y={y}
                        fill={inkFor(segment.color)}
                        fontSize="3.3"
                        textAnchor="middle"
                        dominantBaseline="middle"
                        transform={`rotate(${flip ? mid + 180 : mid} ${x} ${y})`}
                        style={{ fontFamily: '"Noto Sans SC","Microsoft YaHei",sans-serif' }}
                      >
                        {segment.name}
                      </text>
                  </g>
                );
              })}
              {arcs.map((arc) => {
                const [x, y] = polar(50, 50, 46, arc.start);
                return <circle key={`peg-${arc.id}`} cx={x} cy={y} r="1.25" fill="#fff8ef" />;
              })}
              <circle cx="50" cy="50" r="46" fill="none" stroke="#f6e2b3" strokeWidth="1.4" />
              <circle cx="50" cy="50" r="16.5" fill="#241433" />
            </svg>
          </div>
          <button
            type="button"
            onClick={() => void spin()}
            disabled={busy || !wheel?.isEnabled || segments.length === 0}
            className="absolute top-1/2 left-1/2 z-20 flex h-[27%] w-[27%] -translate-x-1/2 -translate-y-1/2 flex-col items-center justify-center rounded-full bg-[radial-gradient(circle_at_35%_30%,#fff8ef,#e6b34d_42%,#b7791f)] text-[#3a2508] shadow-[0_10px_0_#7a4e12] transition active:translate-y-[-46%] active:shadow-[0_6px_0_#7a4e12] disabled:opacity-70"
          >
            <span className="font-[family-name:var(--font-display)] text-lg font-bold tracking-[0.18em] sm:text-2xl">
              {busy ? "..." : "SPIN"}
            </span>
          </button>
        </div>
        {!wheel?.isEnabled && wheel ? (
          <p className="mt-4 text-center text-sm text-[#f6e7c8]">转盘暂时关闭，请稍后再来。</p>
        ) : null}
        {error ? <p className="mt-4 text-center text-sm text-[#ffb4c0]">{error}</p> : null}
        <p className="sr-only" aria-live="polite">
          {result ? `抽中${result.prizeName}` : ""}
        </p>
      </div>
      {result ? (
        <ResultModal result={result} onClose={() => setResult(null)} onAgain={() => void spinAgain()} />
      ) : null}
    </section>
  );
}

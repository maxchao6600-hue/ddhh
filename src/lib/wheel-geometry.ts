export type ArcInput = {
  id: number;
  probability: number;
};

export type ArcSegment = ArcInput & {
  start: number;
  sweep: number;
};

export function buildEqualArcs(segments: readonly { id: number }[]): ArcSegment[] {
  if (segments.length === 0) return [];
  const sweep = 360 / segments.length;
  return segments.map((segment, index) => ({
    id: segment.id,
    probability: 1,
    start: index * sweep,
    sweep,
  }));
}

export function buildArcs(segments: readonly ArcInput[]): ArcSegment[] {
  const total = segments.reduce((sum, segment) => sum + segment.probability, 0);
  if (total <= 0) return [];
  let cursor = 0;
  return segments.map((segment) => {
    const start = (cursor / total) * 360;
    const sweep = (segment.probability / total) * 360;
    cursor += segment.probability;
    return { ...segment, start, sweep };
  });
}

export function polar(cx: number, cy: number, radius: number, angle: number): [number, number] {
  const radians = ((angle - 90) * Math.PI) / 180;
  return [cx + radius * Math.cos(radians), cy + radius * Math.sin(radians)];
}

export function arcPath(start: number, sweep: number, radius = 46): string {
  const [x1, y1] = polar(50, 50, radius, start);
  const [x2, y2] = polar(50, 50, radius, start + sweep);
  const large = sweep > 180 ? 1 : 0;
  return `M 50 50 L ${x1.toFixed(4)} ${y1.toFixed(4)} A ${radius} ${radius} 0 ${large} 1 ${x2.toFixed(4)} ${y2.toFixed(4)} Z`;
}

export function landingAngle(arc: ArcSegment, landingRatio: number): number {
  const ratio = Math.min(1, Math.max(0, landingRatio));
  return arc.start + arc.sweep * ratio;
}

export function nextWheelRotation(
  current: number,
  arcs: readonly ArcSegment[],
  prizeId: number,
  landingRatio: number,
  fullTurns: number,
): number {
  const arc = arcs.find((item) => item.id === prizeId);
  if (!arc || arc.sweep <= 0) {
    throw new Error("中奖扇区不存在");
  }
  const angle = landingAngle(arc, landingRatio);
  const destination = (360 - (angle % 360)) % 360;
  const currentMod = ((current % 360) + 360) % 360;
  let delta = destination - currentMod;
  if (delta < 0) delta += 360;
  delta += fullTurns * 360;
  return current + delta;
}

export function prizeAtPointer(arcs: readonly ArcSegment[], rotation: number): number | null {
  if (arcs.length === 0) return null;
  const mod = ((rotation % 360) + 360) % 360;
  const angle = (360 - mod) % 360;
  for (const arc of arcs) {
    const end = arc.start + arc.sweep;
    if (angle >= arc.start - 1e-8 && angle < end - 1e-9) return arc.id;
  }
  let nearest = arcs[0] ?? null;
  let best = Number.POSITIVE_INFINITY;
  for (const arc of arcs) {
    const mid = arc.start + arc.sweep / 2;
    const distance = Math.min(Math.abs(mid - angle), 360 - Math.abs(mid - angle));
    if (nearest === null || distance < best) {
      nearest = arc;
      best = distance;
    }
  }
  return nearest?.id ?? null;
}

export function inkFor(hex: string): string {
  const r = Number.parseInt(hex.slice(1, 3), 16);
  const g = Number.parseInt(hex.slice(3, 5), 16);
  const b = Number.parseInt(hex.slice(5, 7), 16);
  const luminance = (0.2126 * r + 0.7152 * g + 0.0722 * b) / 255;
  return luminance > 0.55 ? "#1C1408" : "#FFF8EF";
}

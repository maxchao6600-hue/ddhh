import { describe, expect, it } from "vitest";
import { buildEqualArcs, nextWheelRotation, prizeAtPointer } from "@/lib/wheel-geometry";

const weights = [
  { id: 1, probability: 1000 },
  { id: 2, probability: 300 },
  { id: 3, probability: 500 },
  { id: 4, probability: 3000 },
  { id: 5, probability: 10000 },
  { id: 6, probability: 5000 },
  { id: 7, probability: 80200 },
];

describe("wheel stop position", () => {
  it("stops inside the server-selected segment for every prize", () => {
    const arcs = buildEqualArcs(weights);
    const sweep = 360 / 7;
    expect(arcs).toHaveLength(7);
    for (const arc of arcs) expect(arc.sweep).toBeCloseTo(sweep, 8);
    for (const arc of arcs) {
      for (const ratio of [0.12, 0.5, 0.88]) {
        for (const current of [0, 123.4, 350]) {
          const rotation = nextWheelRotation(current, arcs, arc.id, ratio, 6);
          expect(prizeAtPointer(arcs, rotation)).toBe(arc.id);
          expect(rotation).toBeGreaterThan(current);
        }
      }
    }
  });
});

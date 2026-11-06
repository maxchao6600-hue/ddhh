import { describe, expect, it } from "vitest";
import { randomIntBelow, resetRandomSourceForTests } from "@/lib/random";
import { selectByTicket } from "@/lib/selection";

const seed = [
  { id: 1, name: "折扣 50%", probability: 1000 },
  { id: 2, name: "盲盒", probability: 300 },
  { id: 3, name: "现金 RM50", probability: 500 },
  { id: 4, name: "全套拼豆工具", probability: 5000 },
  { id: 5, name: "折扣 5%", probability: 38200 },
  { id: 6, name: "折扣 10%", probability: 15000 },
  { id: 7, name: "谢谢惠顾", probability: 40000 },
];

describe("weighted selection", () => {
  it("gives every seed prize exactly its probability over the full range", () => {
    const counts = new Map<number, number>();
    for (let ticket = 0; ticket < 100000; ticket += 1) {
      const winner = selectByTicket(seed, ticket);
      counts.set(winner.id, (counts.get(winner.id) ?? 0) + 1);
    }
    for (const prize of seed) expect(counts.get(prize.id)).toBe(prize.probability);
  });

  it("never selects a zero-probability prize", () => {
    const prizes = [
      { id: 1, probability: 0 },
      { id: 2, probability: 100000 },
    ];
    for (let ticket = 0; ticket < 1000; ticket += 1) {
      expect(selectByTicket(prizes, ticket).id).toBe(2);
    }
    expect(selectByTicket(prizes, 99999).id).toBe(2);
  });

  it("draws a large cryptographic sample near the configured weights", () => {
    const counts = new Map<number, number>();
    const samples = 20_000;
    for (let index = 0; index < samples; index += 1) {
      const winner = selectByTicket(seed, randomIntBelow(100000));
      counts.set(winner.id, (counts.get(winner.id) ?? 0) + 1);
    }
    expect(counts.get(2) ?? 0).toBeGreaterThan(10);
    expect(counts.get(2) ?? 0).toBeLessThan(160);
    expect(counts.get(1) ?? 0).toBeGreaterThan(80);
    expect(counts.get(5) ?? 0).toBeGreaterThan(7000);
    expect(counts.get(5) ?? 0).toBeLessThan(8300);
    expect(counts.get(7) ?? 0).toBeGreaterThan(7400);
    expect(counts.get(7) ?? 0).toBeLessThan(8600);
    resetRandomSourceForTests();
  });
});

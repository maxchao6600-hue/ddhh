import { describe, expect, it } from "vitest";
import { formatProbability, parseProbabilityInput, sumActiveProbability } from "@/lib/probability";

describe("probability decimals", () => {
  it("parses the seed percentages exactly", () => {
    expect(parseProbabilityInput("1")).toBe(1000);
    expect(parseProbabilityInput("0.3")).toBe(300);
    expect(parseProbabilityInput("0.5")).toBe(500);
    expect(parseProbabilityInput("10")).toBe(10000);
    expect(parseProbabilityInput("38.2")).toBe(38200);
    expect(parseProbabilityInput("15")).toBe(15000);
    expect(parseProbabilityInput("35")).toBe(35000);
    expect(1000 + 300 + 500 + 5000 + 38200 + 15000 + 40000).toBe(100000);
  });

  it("rejects negative values, values above 100, and extra precision", () => {
    expect(parseProbabilityInput("-1")).toBeNull();
    expect(parseProbabilityInput("100.001")).toBeNull();
    expect(parseProbabilityInput("101")).toBeNull();
    expect(parseProbabilityInput("1.2345")).toBeNull();
    expect(parseProbabilityInput("")).toBeNull();
    expect(parseProbabilityInput("1e2")).toBeNull();
  });

  it("does not rescale a total that is one thousandth short of 100%", () => {
    const summary = sumActiveProbability([
      { probability: "33.333", isActive: true },
      { probability: "33.333", isActive: true },
      { probability: "33.333", isActive: true },
    ]);
    expect(summary.total).toBe(99999);
    expect(summary.total).not.toBe(100000);
  });

  it("formats stored integers back to the original decimals", () => {
    expect(formatProbability(300)).toBe("0.3");
    expect(formatProbability(500)).toBe("0.5");
    expect(formatProbability(38200)).toBe("38.2");
    expect(formatProbability(1000)).toBe("1");
  });
});

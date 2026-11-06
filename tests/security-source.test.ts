import { readdirSync, readFileSync, statSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

function sourceFiles(directory: string): string[] {
  const entries = readdirSync(directory);
  return entries.flatMap((entry) => {
    const fullPath = path.join(directory, entry);
    if (statSync(fullPath).isDirectory()) return sourceFiles(fullPath);
    return fullPath.endsWith(".ts") || fullPath.endsWith(".tsx") ? [fullPath] : [];
  });
}

describe("server source boundaries", () => {
  it("does not use Math.random for application code", () => {
    const files = sourceFiles(path.join(process.cwd(), "src"));
    const offenders = files.filter((file) => readFileSync(file, "utf8").includes("Math.random"));
    expect(offenders).toEqual([]);
  });

  it("does not let the spin route treat a request prize as the winner", () => {
    const source = readFileSync(path.join(process.cwd(), "src", "app", "api", "spin", "route.ts"), "utf8");
    expect(source).toContain("executeSpin");
    expect(source).toContain("consumeRateLimit");
    expect(source).not.toContain("body.prizeId");
    expect(source).not.toContain("Math.random");
  });
});

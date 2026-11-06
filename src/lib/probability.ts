export const PROBABILITY_SCALE = 100_000;

const PROBABILITY_PATTERN = /^\d{1,3}(\.\d{1,3})?$/;

export function parseProbabilityInput(input: unknown): number | null {
  if (typeof input === "number") {
    if (!Number.isFinite(input) || input < 0 || input > 100) return null;
    const milli = Math.round(input * 1000);
    if (Math.abs(input * 1000 - milli) > 1e-4) return null;
    if (milli < 0 || milli > PROBABILITY_SCALE) return null;
    return milli;
  }

  if (typeof input !== "string") return null;
  const value = input.trim();
  if (!PROBABILITY_PATTERN.test(value)) return null;
  const [whole, fraction = ""] = value.split(".");
  const milli = Number(whole) * 1000 + Number((fraction + "000").slice(0, 3));
  if (!Number.isInteger(milli) || milli > PROBABILITY_SCALE) return null;
  return milli;
}

export function formatProbability(milli: number): string {
  const negative = milli < 0;
  const absolute = Math.abs(milli);
  const whole = Math.floor(absolute / 1000);
  const fraction = absolute % 1000;
  const text =
    fraction === 0
      ? String(whole)
      : `${whole}.${String(fraction).padStart(3, "0").replace(/0+$/, "")}`;
  return negative ? `-${text}` : text;
}

export function probabilityError(input: string): string | null {
  if (input.trim() === "") return "请填写概率";
  if (parseProbabilityInput(input) === null) {
    return "请输入 0 到 100 之间的数字，最多 3 位小数";
  }
  return null;
}

export function sumActiveProbability(
  rows: Array<{ probability: string; isActive: boolean }>,
): { total: number; invalidRows: number } {
  let total = 0;
  let invalidRows = 0;
  for (const row of rows) {
    const parsed = parseProbabilityInput(row.probability);
    if (parsed === null) {
      invalidRows += 1;
      continue;
    }
    if (row.isActive) total += parsed;
  }
  return { total, invalidRows };
}

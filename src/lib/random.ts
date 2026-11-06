const UINT32_RANGE = 0x1_0000_0000;

function cryptoRandomIntBelow(max: number): number {
  if (!Number.isInteger(max) || max <= 0 || max > UINT32_RANGE) {
    throw new Error("随机范围无效");
  }
  const limit = UINT32_RANGE - (UINT32_RANGE % max);
  const buffer = new Uint32Array(1);
  let value = 0;
  do {
    crypto.getRandomValues(buffer);
    value = buffer[0] ?? 0;
  } while (value >= limit);
  return value % max;
}

let randomSource = cryptoRandomIntBelow;

export function randomIntBelow(max: number): number {
  return randomSource(max);
}

export function setRandomSourceForTests(source: ((max: number) => number) | null): void {
  if (source && process.env.NODE_ENV === "production" && process.env.VITEST !== "true") {
    throw new Error("不能替换随机源");
  }
  randomSource = source ?? cryptoRandomIntBelow;
}

export function resetRandomSourceForTests(): void {
  randomSource = cryptoRandomIntBelow;
}

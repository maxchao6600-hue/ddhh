import { argon2idAsync } from "@noble/hashes/argon2";

const encodedHash =
  /^\$argon2id\$v=19\$((?:[mtp]=\d+,?){3})\$([A-Za-z0-9+/]+)\$([A-Za-z0-9+/]+)$/;

function encodeBase64(data: Uint8Array): string {
  let binary = "";
  for (const byte of data) binary += String.fromCharCode(byte);
  return btoa(binary).replace(/=+$/g, "");
}

function decodeBase64(data: string): Uint8Array {
  const padded = data + "=".repeat((4 - (data.length % 4)) % 4);
  const binary = atob(padded);
  const bytes = new Uint8Array(binary.length);
  for (let index = 0; index < binary.length; index += 1) bytes[index] = binary.charCodeAt(index);
  return bytes;
}

function argonCost(): { m: number; t: number } {
  const memory = Number(process.env.ARGON2_MEMORY ?? 19_456);
  const m = Number.isInteger(memory) && memory >= 32 ? memory : 19_456;
  return { m, t: m >= 19_456 ? 2 : 1 };
}

function equalBytes(left: Uint8Array, right: Uint8Array): boolean {
  const length = Math.max(left.length, right.length);
  let diff = left.length ^ right.length;
  for (let index = 0; index < length; index += 1) diff |= (left[index] ?? 0) ^ (right[index] ?? 0);
  return diff === 0;
}

function parseHash(hash: string): { m: number; t: number; p: number; salt: Uint8Array; digest: Uint8Array } | null {
  const match = encodedHash.exec(hash);
  if (!match) return null;
  const costs = { m: 0, t: 0, p: 0 };
  for (const part of match[1].split(",")) {
    if (!part) continue;
    const [name, value] = part.split("=");
    if (name !== "m" && name !== "t" && name !== "p") return null;
    costs[name] = Number(value);
  }
  if (![costs.m, costs.t, costs.p].every((value) => Number.isInteger(value) && value > 0)) return null;
  return { ...costs, salt: decodeBase64(match[2]), digest: decodeBase64(match[3]) };
}

export async function hashPassword(password: string): Promise<string> {
  const salt = new Uint8Array(16);
  crypto.getRandomValues(salt);
  const { m, t } = argonCost();
  const digest = await argon2idAsync(new TextEncoder().encode(password), salt, { t, m, p: 1, dkLen: 32 });
  return `$argon2id$v=19$m=${m},t=${t},p=1$${encodeBase64(salt)}$${encodeBase64(digest)}`;
}

export async function verifyPassword(password: string, hash: string): Promise<boolean> {
  try {
    const parsed = parseHash(hash);
    if (!parsed) return false;
    const digest = await argon2idAsync(new TextEncoder().encode(password), parsed.salt, {
      t: parsed.t,
      m: parsed.m,
      p: parsed.p,
      dkLen: parsed.digest.length,
    });
    return equalBytes(digest, parsed.digest);
  } catch {
    return false;
  }
}

let dummyHash: Promise<string> | null = null;

export function dummyPasswordHash(): Promise<string> {
  dummyHash ??= hashPassword("dummy-password-not-used-for-login");
  return dummyHash;
}

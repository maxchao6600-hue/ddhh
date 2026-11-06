import { argon2id, argon2Verify } from "hash-wasm";

function argonCost(): { memorySize: number; iterations: number } {
  const memory = Number(process.env.ARGON2_MEMORY ?? 19_456);
  const memorySize = Number.isInteger(memory) && memory >= 32 ? memory : 19_456;
  return { memorySize, iterations: memorySize >= 19_456 ? 2 : 1 };
}

function isHashFormatError(error: unknown): boolean {
  return (
    error instanceof Error &&
    /invalid hash|unsupported version|invalid options|should be|must be specified|specified/i.test(error.message)
  );
}

export async function hashPassword(password: string): Promise<string> {
  const salt = new Uint8Array(16);
  crypto.getRandomValues(salt);
  const { memorySize, iterations } = argonCost();
  return argon2id({
    password,
    salt,
    parallelism: 1,
    iterations,
    memorySize,
    hashLength: 32,
    outputType: "encoded",
  });
}

export async function verifyPassword(password: string, hash: string): Promise<boolean> {
  try {
    return await argon2Verify({ password, hash });
  } catch (error) {
    if (isHashFormatError(error)) return false;
    throw error;
  }
}

import { argon2id, argon2Verify } from "hash-wasm";

type ArgonOptions = {
  parallelism: number;
  iterations: number;
  memorySize: number;
  hashLength: number;
  outputType: "encoded";
  salt: Uint8Array;
  password: string;
};

function argonParams(password: string, salt: Uint8Array): ArgonOptions {
  const memory = Number(process.env.ARGON2_MEMORY ?? 19_456);
  const memorySize = Number.isInteger(memory) && memory >= 32 ? memory : 19_456;
  return {
    password,
    salt,
    parallelism: 1,
    iterations: memorySize >= 19_456 ? 2 : 1,
    memorySize,
    hashLength: 32,
    outputType: "encoded",
  };
}

export async function hashPassword(password: string): Promise<string> {
  const salt = new Uint8Array(16);
  crypto.getRandomValues(salt);
  return argon2id(argonParams(password, salt));
}

export async function verifyPassword(password: string, hash: string): Promise<boolean> {
  try {
    return await argon2Verify({ password, hash });
  } catch {
    return false;
  }
}

let dummyHash: Promise<string> | null = null;

export function dummyPasswordHash(): Promise<string> {
  dummyHash ??= hashPassword("dummy-password-not-used-for-login");
  return dummyHash;
}

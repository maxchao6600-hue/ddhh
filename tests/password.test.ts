import { argon2id } from "hash-wasm";
import { describe, expect, it } from "vitest";
import { hashPassword, verifyPassword } from "@/lib/password";

describe("password hashing", () => {
  it("verifies hashes created by the previous WebAssembly hasher", async () => {
    const salt = Uint8Array.from({ length: 16 }, (_, index) => index + 3);
    const hash = await argon2id({
      password: "correct-horse-1",
      salt,
      parallelism: 1,
      iterations: 2,
      memorySize: 19_456,
      hashLength: 32,
      outputType: "encoded",
    });
    expect(await verifyPassword("correct-horse-1", hash)).toBe(true);
    expect(await verifyPassword("wrong-password-1", hash)).toBe(false);
  });

  it("creates a hash the previous verifier accepts", async () => {
    const hash = await hashPassword("correct-horse-1");
    const { argon2Verify } = await import("hash-wasm");
    expect(await argon2Verify({ password: "correct-horse-1", hash })).toBe(true);
    expect(await verifyPassword("correct-horse-1", hash)).toBe(true);
  });
});

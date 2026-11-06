import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { afterEach, beforeEach } from "vitest";
import { closeDb } from "@/lib/db";
import { resetRandomSourceForTests } from "@/lib/random";

export function useTestDatabase(): void {
  let directory = "";
  beforeEach(() => {
    closeDb();
    resetRandomSourceForTests();
    directory = mkdtempSync(path.join(tmpdir(), "bead-wheel-"));
    process.env.DATABASE_PATH = path.join(directory, "test.db");
  });
  afterEach(() => {
    closeDb();
    resetRandomSourceForTests();
    if (directory) rmSync(directory, { recursive: true, force: true });
  });
}

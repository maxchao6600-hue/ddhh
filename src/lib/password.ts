type PasswordApi = {
  hashPassword(password: string): Promise<string>;
  verifyPassword(password: string, hash: string): Promise<boolean>;
};

function onWorker(): boolean {
  return typeof navigator !== "undefined" && navigator.userAgent === "Cloudflare-Workers";
}

let api: Promise<PasswordApi> | null = null;

function passwordApi(): Promise<PasswordApi> {
  api ??= onWorker() ? import("./password-worker") : import("./password-node");
  return api;
}

export async function hashPassword(password: string): Promise<string> {
  return (await passwordApi()).hashPassword(password);
}

export async function verifyPassword(password: string, hash: string): Promise<boolean> {
  return (await passwordApi()).verifyPassword(password, hash);
}

let dummyHash: Promise<string> | null = null;

export function dummyPasswordHash(): Promise<string> {
  dummyHash ??= hashPassword("dummy-password-not-used-for-login");
  return dummyHash;
}

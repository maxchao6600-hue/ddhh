type ArgonWasmModules = {
  argon2: WebAssembly.Module;
  blake2b: WebAssembly.Module;
};

const knownModules = [
  { length: 6660, prefix: [0, 97, 115, 109, 1, 0, 0, 0, 1, 41, 5, 96, 1, 127, 1, 127], name: "argon2" },
  { length: 7442, prefix: [0, 97, 115, 109, 1, 0, 0, 0, 1, 17, 4, 96, 0, 1, 127, 96], name: "blake2b" },
] as const;

function bytesOf(source: BufferSource): Uint8Array {
  if (source instanceof ArrayBuffer) return new Uint8Array(source);
  return new Uint8Array(source.buffer, source.byteOffset, source.byteLength);
}

function installedModules(): ArgonWasmModules {
  const modules = (globalThis as typeof globalThis & { __argonWasmModules?: ArgonWasmModules }).__argonWasmModules;
  if (!modules?.argon2 || !modules.blake2b) {
    throw new Error("Argon2 WebAssembly module is not available");
  }
  return modules;
}

function knownModule(bytes: Uint8Array): WebAssembly.Module | null {
  const modules = installedModules();
  for (const known of knownModules) {
    if (bytes.byteLength !== known.length || bytes.byteLength < known.prefix.length) continue;
    const matches = known.prefix.every((value, index) => bytes[index] === value);
    if (matches) return modules[known.name];
  }
  return null;
}

// Workers reject WebAssembly.compile() on bytes embedded in JavaScript.
// The Worker entry installs modules that were uploaded and compiled by the runtime.
const nativeCompile = WebAssembly.compile.bind(WebAssembly);
WebAssembly.compile = (source: BufferSource) => {
  const known = knownModule(bytesOf(source));
  if (known) return Promise.resolve(known);
  return nativeCompile(source);
};

export { hashPassword, verifyPassword } from "./password-node";

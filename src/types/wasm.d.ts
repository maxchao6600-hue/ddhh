export {};

declare global {
  var __argonWasmModules: {
    argon2: WebAssembly.Module;
    blake2b: WebAssembly.Module;
  } | undefined;
}

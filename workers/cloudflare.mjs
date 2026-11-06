import argon2 from "../src/lib/wasm/argon2.wasm";
import blake2b from "../src/lib/wasm/blake2b.wasm";
import nextWorker, { BucketCachePurge, DOQueueHandler, DOShardedTagCache } from "../.open-next/worker.js";

globalThis.__argonWasmModules = { argon2, blake2b };

export { BucketCachePurge, DOQueueHandler, DOShardedTagCache };
export default nextWorker;

'use client';

import * as Comlink from 'comlink';
import type { WasmWorkerApi } from './wasm-worker';

let proxy: Comlink.Remote<WasmWorkerApi> | null = null;
let initPromise: Promise<Comlink.Remote<WasmWorkerApi>> | null = null;

export async function getWorker(): Promise<Comlink.Remote<WasmWorkerApi>> {
  if (proxy) return proxy;
  if (initPromise) return initPromise;
  initPromise = (async () => {
    const worker = new Worker(new URL('./wasm-worker.ts', import.meta.url), {
      type: 'module',
    });
    const wrapped = Comlink.wrap<WasmWorkerApi>(worker);
    await wrapped.init();
    proxy = wrapped;
    return wrapped;
  })();
  return initPromise;
}

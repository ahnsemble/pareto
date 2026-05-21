'use client';

import { useEffect, useState } from 'react';
import { Link } from '../../i18n/navigation';
import { decodeRawUrl } from '../lib/wasm';

type DecodeState =
  | { phase: 'idle' }
  | { phase: 'loading' }
  | { phase: 'success'; raw: string; decoded: unknown }
  | { phase: 'error'; raw: string; message: string };

export default function Home() {
  const [state, setState] = useState<DecodeState>({ phase: 'idle' });

  useEffect(() => {
    let cancelled = false;
    const params = new URLSearchParams(window.location.search);
    const raw = params.get('raw');
    if (!raw) {
      setState({ phase: 'idle' });
      return;
    }
    setState({ phase: 'loading' });
    (async () => {
      try {
        const decoded = await decodeRawUrl(raw);
        if (!cancelled) setState({ phase: 'success', raw, decoded });
      } catch (err) {
        if (!cancelled) {
          const message = err instanceof Error ? err.message : String(err);
          setState({ phase: 'error', raw, message });
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <main className="min-h-screen p-8 font-mono text-sm">
      <header className="mb-6 flex items-baseline gap-4">
        <h1 className="text-xl font-semibold">Tangtang</h1>
        <Link
          href="/optimize"
          className="text-[color:var(--color-primary)] underline-offset-4 hover:underline"
        >
          → /optimize
        </Link>
      </header>
      <p className="mb-6 text-[color:var(--color-text-muted)]">
        Append <code>?raw=&lt;lzma_base64&gt;</code> to the URL to decode a
        Survivor.io public share payload via WASM.
      </p>
      {state.phase === 'idle' && (
        <p>No <code>raw</code> query parameter detected.</p>
      )}
      {state.phase === 'loading' && <p>Loading WASM module…</p>}
      {state.phase === 'error' && (
        <section>
          <p className="text-[color:var(--color-danger)]">Decode failed: {state.message}</p>
          <details className="mt-2">
            <summary>raw payload</summary>
            <pre className="whitespace-pre-wrap break-all">{state.raw}</pre>
          </details>
        </section>
      )}
      {state.phase === 'success' && (
        <section>
          <p className="mb-2 text-[color:var(--color-accent)]">Decoded successfully.</p>
          <pre className="whitespace-pre-wrap break-all rounded bg-[color:var(--color-surface)] p-3">
            {JSON.stringify(state.decoded, null, 2)}
          </pre>
        </section>
      )}
    </main>
  );
}

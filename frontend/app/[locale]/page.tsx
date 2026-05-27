'use client';

import { Link } from '../../i18n/navigation';

export default function Home() {
  return (
    <main className="min-h-screen p-8 font-mono text-sm">
      <header className="mb-6 flex items-baseline gap-4">
        <h1 className="text-xl font-semibold">Tangtang</h1>
        <Link
          href="/v3/optimizer/tech-parts"
          className="text-[color:var(--color-primary)] underline-offset-4 hover:underline"
        >
          → /v3/optimizer/tech-parts
        </Link>
      </header>
      <p className="mb-6 text-[color:var(--color-text-muted)]">
        Build, import, and compare Tangtang tech profiles.
      </p>
    </main>
  );
}

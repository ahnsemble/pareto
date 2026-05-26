'use client';

import { useLocale } from 'next-intl';
import { useEffect } from 'react';

import { Link } from '../../../i18n/navigation';

const LEGACY_OPTIMIZE_REDIRECT_TARGET = '/v3/optimizer/tech-parts';

function targetForLocale(locale: string) {
  return `/${locale}${LEGACY_OPTIMIZE_REDIRECT_TARGET}`;
}

export default function OptimizePage() {
  const locale = useLocale();

  useEffect(() => {
    const targetUrl = new URL(targetForLocale(locale), window.location.origin);
    targetUrl.search = window.location.search;
    targetUrl.hash = window.location.hash;
    window.location.replace(targetUrl.toString());
  }, [locale]);

  return (
    <main className="mx-auto flex min-h-screen max-w-2xl flex-col items-start justify-center gap-4 px-6 py-16">
      <h1 className="text-2xl font-semibold tracking-tight">Tangtang</h1>
      <p className="text-sm text-[color:var(--color-text-muted)]">
        Redirecting to the current optimizer.
      </p>
      <Link
        href={LEGACY_OPTIMIZE_REDIRECT_TARGET}
        className="inline-flex min-h-[44px] items-center justify-center rounded-md bg-[color:var(--color-primary)] px-4 py-2 font-mono text-sm font-semibold text-[color:var(--color-bg)] transition hover:bg-[color:var(--color-primary-strong)]"
      >
        Open optimizer
      </Link>
    </main>
  );
}

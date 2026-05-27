'use client';

import { useMemo } from 'react';
import { useLocale } from 'next-intl';
import { usePathname, useSearchParams } from 'next/navigation';

const locales = ['en', 'ko'] as const;
type ToggleLocale = (typeof locales)[number];

function targetHref(pathname: string, search: string, targetLocale: ToggleLocale): string {
  const pathWithoutLocale = pathname.replace(/^\/(en|ko)(?=\/|$)/, '') || '';
  const localizedPath = `/${targetLocale}${pathWithoutLocale}`;
  return search ? `${localizedPath}?${search}` : localizedPath;
}

export function LanguageToggle() {
  const locale = useLocale();
  const pathname = usePathname() || `/${locale}`;
  const searchParams = useSearchParams();
  const search = searchParams.toString();
  const links = useMemo(
    () =>
      locales.map((targetLocale) => ({
        locale: targetLocale,
        href: targetHref(pathname, search, targetLocale),
        active: locale === targetLocale,
      })),
    [locale, pathname, search],
  );

  return (
    <div className="mx-auto flex w-full max-w-6xl justify-end px-6 pt-3" data-testid="language-toggle">
      <nav
        aria-label="Language / 언어"
        className="inline-grid min-h-[36px] grid-cols-2 overflow-hidden rounded-md border border-[color:var(--color-border)] bg-[color:var(--color-surface)] text-xs font-semibold"
      >
        {links.map((link) => (
          <a
            key={link.locale}
            aria-current={link.active ? 'page' : undefined}
            className={
              link.active
                ? 'inline-flex min-w-[44px] items-center justify-center bg-[color:var(--color-primary)] px-3 text-[color:var(--color-bg)]'
                : 'inline-flex min-w-[44px] items-center justify-center px-3 text-[color:var(--color-text-muted)] hover:bg-[color:var(--color-surface-elev)] hover:text-[color:var(--color-text)]'
            }
            data-testid={`language-toggle-${link.locale}`}
            href={link.href}
            hrefLang={link.locale}
            lang={link.locale}
          >
            {link.locale === 'en' ? 'EN' : '한'}
          </a>
        ))}
      </nav>
    </div>
  );
}

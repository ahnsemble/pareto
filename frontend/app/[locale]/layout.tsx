import type { Metadata, Viewport } from 'next';
import { Suspense } from 'react';
import { Geist } from 'next/font/google';
import { hasLocale, NextIntlClientProvider } from 'next-intl';
import { setRequestLocale, getMessages } from 'next-intl/server';
import { notFound } from 'next/navigation';
import { routing } from '../../i18n/routing';
import { LanguageToggle } from '../../components/LanguageToggle';
import '../globals.css';

const geistSans = Geist({
  variable: '--font-geist-sans',
  subsets: ['latin'],
  display: 'swap',
});

const SITE_URL = 'https://tanggall.vercel.app';

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
};

const META_BY_LOCALE = {
  en: {
    title: 'Tangtang — Build optimizer for Survivor.io',
    description: 'WASM-powered efficient-frontier optimizer for Survivor.io builds. Compare decks, find optimal trade-offs.',
    ogAlt: 'Tangtang — Build optimizer for Survivor.io',
  },
  ko: {
    title: 'Tangtang — 탕탕특공대 빌드 최적화 도구',
    description: '빌드, 계산하지 말고 비교하세요. 효율 프론티어로 최적 빌드를 한눈에 찾으세요.',
    ogAlt: 'Tangtang — 탕탕특공대 빌드 최적화 도구',
  },
} as const;

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const meta = META_BY_LOCALE[locale as keyof typeof META_BY_LOCALE] ?? META_BY_LOCALE.en;
  return {
    metadataBase: new URL(SITE_URL),
    title: meta.title,
    description: meta.description,
    alternates: {
      canonical: `/${locale}`,
      languages: {
        en: '/en',
        ko: '/ko',
      },
    },
    openGraph: {
      type: 'website',
      siteName: 'Tangtang',
      title: meta.title,
      description: meta.description,
      url: `/${locale}`,
      locale: locale === 'ko' ? 'ko_KR' : 'en_US',
      images: [
        {
          url: '/og-community.png',
          width: 1200,
          height: 630,
          alt: meta.ogAlt,
        },
      ],
    },
    twitter: {
      card: 'summary_large_image',
      title: meta.title,
      description: meta.description,
      images: ['/og-community.png'],
    },
  };
}

export function generateStaticParams() {
  return routing.locales.map((locale) => ({ locale }));
}

export default async function LocaleLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  if (!hasLocale(routing.locales, locale)) notFound();
  setRequestLocale(locale);
  const messages = await getMessages();
  return (
    <html lang={locale}>
      <body className={`${geistSans.variable} antialiased`}>
        <NextIntlClientProvider messages={messages}>
          <Suspense fallback={null}>
            <LanguageToggle />
          </Suspense>
          {children}
        </NextIntlClientProvider>
      </body>
    </html>
  );
}

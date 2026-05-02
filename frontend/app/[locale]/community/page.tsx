import type { Metadata } from 'next';
import { setRequestLocale } from 'next-intl/server';
import { Link } from '../../../i18n/navigation';
import { routing } from '../../../i18n/routing';

const KO_TITLE = '파레토 — 탕탕특공대 빌드 최적화 도구 | Pareto Optimizer';
const KO_DESCRIPTION =
  '탕탕특공대(Survivor.io) 장비·펫·테크 파츠 빌드를 파레토 프론티어로 최적화하세요. 두 빌드 동시 비교, 한국어 UI 완벽 지원. 무료 웹 도구.';
const KO_KEYWORDS = [
  '탕탕특공대 빌드',
  'Survivor.io 빌드 최적화',
  '파레토 최적화',
  '탕탕특공대 장비 계산기',
  '탕탕특공대 덱 비교',
  'Survivor.io optimizer',
  'Survivor.io build calculator',
  '탕탕특공대 테크 파츠',
  '탕탕특공대 펫 티어',
  'Pareto frontier tool',
];

export function generateStaticParams() {
  return routing.locales.map((locale) => ({ locale }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  if (locale === 'ko') {
    return {
      title: KO_TITLE,
      description: KO_DESCRIPTION,
      keywords: KO_KEYWORDS,
      openGraph: {
        title: KO_TITLE,
        description: KO_DESCRIPTION,
        locale: 'ko_KR',
        type: 'website',
        images: [
          {
            url: '/og-community.png',
            width: 1200,
            height: 630,
            alt: 'Pareto — 탕탕특공대 빌드 최적화 도구',
          },
        ],
      },
    };
  }
  return {
    title: 'Pareto Community — Coming Soon',
    description: 'Korean community landing for Pareto. English version coming soon.',
    robots: { index: false, follow: false },
  };
}

interface FaqItem {
  q: string;
  a: string;
}

const FAQ_ITEMS: FaqItem[] = [
  {
    q: '파레토 프론티어가 뭔가요?',
    a: '파레토 프론티어는 여러 능력치 (예: DPS + 생존력) 를 동시에 고려했을 때, 어느 하나도 손해 보지 않는 최적 빌드 조합의 경계선이에요. 이 경계선 위에 있는 빌드가 가장 효율적인 빌드입니다.',
  },
  {
    q: '빌드를 어떻게 입력하나요?',
    a: '보유한 장비·펫·테크 파츠를 드롭다운에서 선택하거나, 기존에 저장한 JSON 파일을 "가져오기" 버튼으로 불러올 수 있어요. 검색 기능으로 원하는 아이템을 빠르게 찾을 수 있습니다.',
  },
  {
    q: '카드 데이터는 어디서 가져오나요?',
    a: 'Survivor.io (탕탕특공대) 인게임 데이터를 기반으로 합니다. 공식 그래픽 에셋은 사용하지 않으며, 능력치 수치와 합성 규칙을 수학적으로 모델링했어요. 업데이트 패치마다 데이터를 검증하고 반영합니다.',
  },
  {
    q: '계산 결과가 정확한가요?',
    a: 'WASM 기반 파레토 최적화 엔진이 브라우저에서 직접 계산합니다. 모든 연산은 수학적 모델에 기반하며, 인게임 실제 전투와는 시뮬레이션 오차가 있을 수 있어요. 결과는 빌드 방향성 판단의 참고 자료로 활용해 주세요.',
  },
  {
    q: '빌드를 친구한테 공유할 수 있나요?',
    a: '네! "내보내기" 버튼으로 빌드를 JSON 형태로 저장하고, 카카오톡·디스코드·네이버 카페에서 파일을 공유하면 됩니다. 상대방이 "가져오기"로 바로 불러올 수 있어요. URL 공유 기능도 추후 지원 예정입니다.',
  },
  {
    q: '모바일에서도 쓸 수 있나요?',
    a: '물론이요! 반응형 디자인으로 제작되어 스마트폰 브라우저에서 바로 사용할 수 있습니다. 탕탕특공대 플레이 중에도 브라우저를 열어 빌드를 확인해 보세요.',
  },
];

interface FeatureItem {
  title: string;
  body: string;
  icon: React.ReactNode;
}

const FEATURE_ICON_CLASS = 'h-6 w-6 stroke-[color:var(--color-primary)]';

function FeatureIconChart() {
  return (
    <svg
      className={FEATURE_ICON_CLASS}
      viewBox="0 0 24 24"
      fill="none"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M3 20h18" />
      <circle cx="6" cy="14" r="1.4" />
      <circle cx="11" cy="9" r="1.4" />
      <circle cx="16" cy="11" r="1.4" />
      <circle cx="20" cy="6" r="1.4" />
      <path d="M6 14 11 9 16 11 20 6" />
    </svg>
  );
}

function FeatureIconSplit() {
  return (
    <svg
      className={FEATURE_ICON_CLASS}
      viewBox="0 0 24 24"
      fill="none"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <rect x="3" y="4" width="8" height="16" rx="1.5" />
      <rect x="13" y="4" width="8" height="16" rx="1.5" />
    </svg>
  );
}

function FeatureIconShare() {
  return (
    <svg
      className={FEATURE_ICON_CLASS}
      viewBox="0 0 24 24"
      fill="none"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <circle cx="6" cy="12" r="2.5" />
      <circle cx="18" cy="6" r="2.5" />
      <circle cx="18" cy="18" r="2.5" />
      <path d="M8.2 10.8 15.8 7.2" />
      <path d="M8.2 13.2 15.8 16.8" />
    </svg>
  );
}

function FeatureIconLanguage() {
  return (
    <svg
      className={FEATURE_ICON_CLASS}
      viewBox="0 0 24 24"
      fill="none"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <circle cx="12" cy="12" r="9" />
      <path d="M3 12h18" />
      <path d="M12 3a14 14 0 0 1 0 18" />
      <path d="M12 3a14 14 0 0 0 0 18" />
    </svg>
  );
}

const FEATURES: FeatureItem[] = [
  {
    title: '파레토 프론티어',
    body: '내 장비 조합의 최적 경계선을 한눈에 확인하세요. 어떤 빌드가 가장 효율적인지 차트로 바로 보여드립니다.',
    icon: <FeatureIconChart />,
  },
  {
    title: '덱 비교',
    body: '두 빌드를 나란히 놓고 파레토 프론티어 위에서 비교하세요. 어디가 강하고 어디가 약한지 차이점을 강조해 드립니다.',
    icon: <FeatureIconSplit />,
  },
  {
    title: '빌드 공유',
    body: '내 빌드를 JSON으로 내보내고, 친구나 길드원의 빌드를 바로 가져오세요. 네이버 카페·디스코드에서 빌드 공유가 간편해집니다.',
    icon: <FeatureIconShare />,
  },
  {
    title: '한국어 UI',
    body: '탕탕특공대 인게임 용어 그대로. 장비·스킬·펫 이름까지 한국어로 매핑되어 영어 몰라도 문제없습니다.',
    icon: <FeatureIconLanguage />,
  },
];

interface StepItem {
  title: string;
  body: string;
}

const STEPS: StepItem[] = [
  {
    title: '내 빌드 입력',
    body: '보유한 장비·펫·테크 파츠를 선택하거나, 기존 빌드 JSON을 가져오세요. 드롭다운과 검색으로 빠르게 입력할 수 있습니다.',
  },
  {
    title: '파레토 분석 실행',
    body: 'WASM 엔진이 브라우저에서 직접 최적 조합을 계산합니다. 서버 전송 없이 내 데이터는 내 기기에만 머무릅니다.',
  },
  {
    title: '결과 비교 & 공유',
    body: '파레토 프론티어에서 최적 빌드를 확인하고, 다른 빌드와 나란히 비교하세요. 빌드를 내보내서 커뮤니티에 공유할 수 있습니다.',
  },
];

function HeroFrontierVisual() {
  return (
    <svg
      viewBox="0 0 320 200"
      className="h-auto w-full max-w-md"
      role="img"
      aria-label="파레토 프론티어 시각화 미리보기 — 산점도와 최적 경계선"
    >
      <rect
        x="0"
        y="0"
        width="320"
        height="200"
        fill="var(--color-surface)"
        rx="12"
      />
      <line x1="40" y1="170" x2="300" y2="170" stroke="var(--color-border)" strokeWidth="1" />
      <line x1="40" y1="30" x2="40" y2="170" stroke="var(--color-border)" strokeWidth="1" />
      <text x="40" y="190" fill="var(--color-text-muted)" fontSize="10" fontFamily="var(--font-mono)">
        DPS
      </text>
      <text
        x="20"
        y="30"
        fill="var(--color-text-muted)"
        fontSize="10"
        fontFamily="var(--font-mono)"
        transform="rotate(-90 20 30)"
      >
        생존
      </text>
      <circle cx="70" cy="150" r="3" fill="var(--color-text-muted)" opacity="0.6" />
      <circle cx="100" cy="135" r="3" fill="var(--color-text-muted)" opacity="0.6" />
      <circle cx="130" cy="120" r="3" fill="var(--color-text-muted)" opacity="0.6" />
      <circle cx="160" cy="100" r="3" fill="var(--color-text-muted)" opacity="0.6" />
      <circle cx="200" cy="85" r="3" fill="var(--color-text-muted)" opacity="0.6" />
      <circle cx="230" cy="70" r="3" fill="var(--color-text-muted)" opacity="0.6" />
      <circle cx="260" cy="60" r="3" fill="var(--color-text-muted)" opacity="0.6" />
      <path
        d="M 60 165 Q 130 130 200 80 T 280 45"
        fill="none"
        stroke="var(--color-primary)"
        strokeWidth="2"
        strokeDasharray="4 3"
      />
      <circle cx="60" cy="165" r="4.5" fill="var(--color-primary)" />
      <circle cx="130" cy="125" r="4.5" fill="var(--color-primary)" />
      <circle cx="200" cy="80" r="4.5" fill="var(--color-accent)" />
      <circle cx="280" cy="45" r="4.5" fill="var(--color-accent)" />
      <text
        x="200"
        y="65"
        fill="var(--color-accent)"
        fontSize="11"
        fontFamily="var(--font-mono)"
        textAnchor="middle"
      >
        최적
      </text>
    </svg>
  );
}

function CommunityComingSoon() {
  return (
    <main className="mx-auto flex min-h-[60vh] max-w-2xl flex-col items-start justify-center gap-4 px-6 py-16">
      <h1 className="text-3xl font-semibold tracking-tight">
        Pareto Community — Coming Soon in English
      </h1>
      <p className="text-[color:var(--color-text-muted)]">
        Our community landing page is currently available in Korean. The English
        version is on the way. Meanwhile, you can use the optimizer and the
        two-deck comparison tool.
      </p>
      <div className="flex flex-wrap gap-3 pt-2">
        <Link
          href="/optimize"
          className="min-h-[44px] rounded-md border border-[color:var(--color-border)] px-4 py-2 font-mono text-sm hover:border-[color:var(--color-primary)]"
        >
          → /optimize
        </Link>
        <Link
          href="/twodeck"
          className="min-h-[44px] rounded-md border border-[color:var(--color-border)] px-4 py-2 font-mono text-sm hover:border-[color:var(--color-primary)]"
        >
          → /twodeck
        </Link>
        <Link
          href="/community"
          locale="ko"
          className="min-h-[44px] rounded-md border border-[color:var(--color-primary)] px-4 py-2 font-mono text-sm text-[color:var(--color-primary)] hover:bg-[color:var(--color-primary)]/10"
        >
          한국어 버전 보기 →
        </Link>
      </div>
    </main>
  );
}

function CommunityKorean() {
  return (
    <main className="mx-auto flex w-full max-w-6xl flex-col gap-20 px-5 py-12 sm:px-8 sm:py-16">
      <section
        aria-labelledby="hero-heading"
        className="flex flex-col items-start gap-10 lg:flex-row lg:items-center lg:gap-12"
      >
        <div className="flex-1 space-y-6">
          <p className="font-mono text-xs uppercase tracking-[0.2em] text-[color:var(--color-primary)]">
            Pareto · Survivor.io 빌드 최적화
          </p>
          <h1
            id="hero-heading"
            className="text-3xl font-bold leading-tight tracking-tight sm:text-4xl lg:text-5xl"
          >
            빌드, 계산하지 말고 비교하세요
          </h1>
          <p className="max-w-xl text-base text-[color:var(--color-text-muted)] sm:text-lg">
            파레토 프론티어로 내 장비 조합의 최적 경계선을 한눈에. 탕탕특공대 빌드 최적화 도구.
          </p>
          <div className="flex flex-wrap gap-3 pt-2">
            <Link
              href="/optimize"
              data-testid="cta-primary"
              className="inline-flex min-h-[48px] items-center justify-center rounded-md bg-[color:var(--color-primary)] px-6 py-3 font-semibold text-[color:var(--color-bg)] shadow-[var(--shadow-glow-primary)] transition hover:bg-[color:var(--color-primary-strong)]"
            >
              지금 최적화 시작
            </Link>
            <Link
              href="/twodeck"
              data-testid="cta-secondary"
              className="inline-flex min-h-[48px] items-center justify-center rounded-md border border-[color:var(--color-border)] px-6 py-3 font-medium text-[color:var(--color-text)] transition hover:border-[color:var(--color-primary)] hover:text-[color:var(--color-primary)]"
            >
              데모 보기
            </Link>
          </div>
        </div>
        <div className="flex w-full flex-1 justify-center lg:justify-end">
          <HeroFrontierVisual />
        </div>
      </section>

      <section aria-labelledby="features-heading" className="space-y-8">
        <header className="space-y-2">
          <p className="font-mono text-xs uppercase tracking-[0.2em] text-[color:var(--color-primary)]">
            Features
          </p>
          <h2 id="features-heading" className="text-2xl font-semibold sm:text-3xl">
            도구가 제공하는 4가지 가치
          </h2>
        </header>
        <ul
          data-testid="features-grid"
          className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4"
        >
          {FEATURES.map((feature) => (
            <li
              key={feature.title}
              className="flex flex-col gap-3 rounded-lg border border-[color:var(--color-border)] bg-[color:var(--color-surface)] p-5"
            >
              <div className="flex h-10 w-10 items-center justify-center rounded-md bg-[color:var(--color-surface-elev)]">
                {feature.icon}
              </div>
              <h3 className="text-base font-semibold">{feature.title}</h3>
              <p className="text-sm text-[color:var(--color-text-muted)]">{feature.body}</p>
            </li>
          ))}
        </ul>
      </section>

      <section aria-labelledby="how-heading" className="space-y-8">
        <header className="space-y-2">
          <p className="font-mono text-xs uppercase tracking-[0.2em] text-[color:var(--color-primary)]">
            How It Works
          </p>
          <h2 id="how-heading" className="text-2xl font-semibold sm:text-3xl">
            3단계로 끝내는 빌드 최적화
          </h2>
        </header>
        <ol className="grid grid-cols-1 gap-4 md:grid-cols-3">
          {STEPS.map((step, idx) => (
            <li
              key={step.title}
              className="relative space-y-3 rounded-lg border border-[color:var(--color-border)] bg-[color:var(--color-surface)] p-5"
            >
              <span
                className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-[color:var(--color-primary)] font-mono text-sm font-semibold text-[color:var(--color-primary)]"
                aria-hidden="true"
              >
                {idx + 1}
              </span>
              <h3 className="text-base font-semibold">{step.title}</h3>
              <p className="text-sm text-[color:var(--color-text-muted)]">{step.body}</p>
            </li>
          ))}
        </ol>
      </section>

      <section aria-labelledby="faq-heading" className="space-y-8">
        <header className="space-y-2">
          <p className="font-mono text-xs uppercase tracking-[0.2em] text-[color:var(--color-primary)]">
            FAQ
          </p>
          <h2 id="faq-heading" className="text-2xl font-semibold sm:text-3xl">
            자주 묻는 질문
          </h2>
        </header>
        <div className="space-y-2" data-testid="faq-list">
          {FAQ_ITEMS.map((item) => (
            <details
              key={item.q}
              className="group rounded-md border border-[color:var(--color-border)] bg-[color:var(--color-surface)] open:border-[color:var(--color-primary)]/60"
              data-testid="faq-item"
            >
              <summary className="flex cursor-pointer list-none items-center justify-between gap-3 px-4 py-3 text-base font-medium">
                <span>{item.q}</span>
                <span
                  aria-hidden="true"
                  className="font-mono text-[color:var(--color-text-muted)] transition group-open:rotate-45"
                >
                  +
                </span>
              </summary>
              <p className="px-4 pb-4 text-sm leading-relaxed text-[color:var(--color-text-muted)]">
                {item.a}
              </p>
            </details>
          ))}
        </div>
      </section>

      <section
        aria-labelledby="cta-heading"
        className="space-y-6 rounded-xl border border-[color:var(--color-border)] bg-[color:var(--color-surface)] p-8 text-center sm:p-12"
      >
        <h2
          id="cta-heading"
          className="text-2xl font-semibold sm:text-3xl"
        >
          지금 시작하기
        </h2>
        <p className="mx-auto max-w-xl text-sm text-[color:var(--color-text-muted)] sm:text-base">
          무료입니다. 가입 없이 브라우저에서 바로 사용할 수 있어요.
        </p>
        <div className="flex flex-wrap justify-center gap-3">
          <Link
            href="/optimize"
            className="inline-flex min-h-[48px] items-center justify-center rounded-md bg-[color:var(--color-primary)] px-6 py-3 font-semibold text-[color:var(--color-bg)] shadow-[var(--shadow-glow-primary)] transition hover:bg-[color:var(--color-primary-strong)]"
          >
            지금 최적화 시작
          </Link>
        </div>
        <ul className="flex flex-wrap justify-center gap-2 pt-2 text-sm">
          <li>
            <a
              href="#"
              className="inline-flex min-h-[40px] items-center rounded-md border border-[color:var(--color-border)] px-3 py-1.5 hover:border-[color:var(--color-primary)] hover:text-[color:var(--color-primary)]"
            >
              네이버 카페 참여
            </a>
          </li>
          <li>
            <a
              href="#"
              className="inline-flex min-h-[40px] items-center rounded-md border border-[color:var(--color-border)] px-3 py-1.5 hover:border-[color:var(--color-primary)] hover:text-[color:var(--color-primary)]"
            >
              디스코드 참여
            </a>
          </li>
          <li>
            <a
              href="#"
              className="inline-flex min-h-[40px] items-center rounded-md border border-[color:var(--color-border)] px-3 py-1.5 hover:border-[color:var(--color-primary)] hover:text-[color:var(--color-primary)]"
            >
              인벤 게시판
            </a>
          </li>
        </ul>
      </section>

      <footer className="space-y-4 border-t border-[color:var(--color-border)] pt-8 text-sm text-[color:var(--color-text-muted)]">
        <p className="font-medium text-[color:var(--color-text)]">
          Pareto — Survivor.io (탕탕특공대) 빌드 최적화 도구
        </p>
        <ul className="flex flex-wrap gap-x-4 gap-y-2">
          <li>MIT License</li>
          <li>
            <a href="#" className="hover:text-[color:var(--color-primary)]">
              문의 / 버그 리포트
            </a>
          </li>
          <li>
            <a href="#" className="hover:text-[color:var(--color-primary)]">
              이용약관
            </a>
          </li>
          <li>
            <a href="#" className="hover:text-[color:var(--color-primary)]">
              개인정보처리방침
            </a>
          </li>
        </ul>
        <p className="max-w-2xl text-xs leading-relaxed">
          Pareto는 Habby 또는 Survivor.io의 공식 제휴 도구가 아닙니다. 모든 게임 데이터는 공개 정보에 기반합니다.
        </p>
      </footer>
    </main>
  );
}

export default async function CommunityPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  if (locale === 'ko') {
    return <CommunityKorean />;
  }
  return <CommunityComingSoon />;
}

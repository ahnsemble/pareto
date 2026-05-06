import path from 'node:path';
import type { NextConfig } from 'next';
import createNextIntlPlugin from 'next-intl/plugin';

const withNextIntl = createNextIntlPlugin('./i18n/request.ts');

const nextConfig: NextConfig = {
  output: 'export',
  images: { unoptimized: true },
  outputFileTracingRoot: path.join(__dirname, '..'),
  transpilePackages: ['tttg_forge_wasm'],
};

export default withNextIntl(nextConfig);

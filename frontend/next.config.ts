import path from 'node:path';
import type { NextConfig } from 'next';
import createNextIntlPlugin from 'next-intl/plugin';

const withNextIntl = createNextIntlPlugin('./i18n/request.ts');
const isDevelopment = process.env.NODE_ENV === 'development';
const publicWasmModulePath = path.join(__dirname, '.generated/public-wasm/tttg_forge_wasm.js');
const publicWasmTurbopackAlias = './.generated/public-wasm/tttg_forge_wasm.js';

const nextConfig: NextConfig = {
  ...(isDevelopment ? {} : { output: 'export' as const }),
  devIndicators: false,
  images: { unoptimized: true },
  outputFileTracingRoot: path.join(__dirname, '..'),
  transpilePackages: ['tttg_forge_wasm'],
  turbopack: {
    resolveAlias: {
      tttg_forge_wasm: publicWasmTurbopackAlias,
    },
  },
  webpack: (config) => {
    config.resolve = config.resolve ?? {};
    config.resolve.alias = {
      ...(config.resolve.alias ?? {}),
      tttg_forge_wasm: publicWasmModulePath,
    };
    return config;
  },
};

export default withNextIntl(nextConfig);

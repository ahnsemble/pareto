import fs from 'node:fs/promises';
import path from 'node:path';
import { createHash } from 'node:crypto';

const sourceUrl = process.env.SIO_TOOLS_URL ?? 'https://sio-tools.vercel.app';
const outputDir =
  process.env.OUTPUT_DIR ?? path.join(process.cwd(), 'artifacts/td11/sio_tools_asset_discovery');
const summaryPath = path.join(outputDir, 'asset_discovery_summary.json');
const reportPath = path.join(outputDir, 'asset_discovery_report.md');
const mirrorDir = path.join(outputDir, 'mirrored_assets');

const keywordPatterns = [
  'lm(',
  'collectibles',
  'customSets',
  'petSkills',
  'xeno',
  'mounts',
  'evo',
  'lme',
  'ee',
  'items',
  'stats',
  'importScripts',
  'worker',
];

function sha256(value) {
  return createHash('sha256').update(value).digest('hex');
}

function safeAssetName(url) {
  const parsed = new URL(url);
  const basename = path.basename(parsed.pathname) || 'asset';
  const clean = basename.replace(/[^a-zA-Z0-9._-]/g, '_');
  return `${sha256(url).slice(0, 12)}-${clean}`;
}

function unique(values) {
  return [...new Set(values.filter(Boolean))];
}

function resolveAssetUrl(baseUrl, candidate) {
  try {
    return new URL(candidate, baseUrl).toString();
  } catch {
    return null;
  }
}

function extractAssetCandidates(html, baseUrl) {
  const candidates = [];
  for (const regex of [
    /\bsrc=["']([^"']+\.js(?:\?[^"']*)?)["']/g,
    /\bhref=["']([^"']+\.js(?:\?[^"']*)?)["']/g,
    /\\?"(\/_next\/static\/chunks\/[^"\\]+?\.js(?:\?[^"\\]*)?)\\?"/g,
    /(\/_next\/static\/chunks\/[^"'\\\s<>]+?\.js(?:\?[^"'\\\s<>]*)?)/g,
  ]) {
    let match;
    while ((match = regex.exec(html))) {
      const resolved = resolveAssetUrl(baseUrl, match[1].replaceAll('\\u0026', '&'));
      if (resolved) {
        candidates.push(resolved);
      }
    }
  }
  return unique(candidates);
}

function extractChunkCandidatesFromJs(js, assetUrl) {
  const candidates = [];
  for (const regex of [
    /static\/chunks\/[^"'`\\]+?\.js/g,
    /["']([^"']*worker[^"']*?\.js(?:\?[^"']*)?)["']/gi,
    /["']([^"']*skills[^"']*?\.js(?:\?[^"']*)?)["']/gi,
  ]) {
    let match;
    while ((match = regex.exec(js))) {
      const raw = match[1] ?? match[0];
      const normalized = raw.startsWith('/') ? raw : `/_next/${raw.replace(/^\/?/, '')}`;
      const resolved = resolveAssetUrl(assetUrl, normalized);
      if (resolved) {
        candidates.push(resolved);
      }
    }
  }
  return unique(candidates);
}

function sourceMapCandidates(assetUrl, js) {
  const candidates = [];
  const sourceMapMatch = js.match(/\/\/# sourceMappingURL=(.+)\s*$/m);
  if (sourceMapMatch) {
    candidates.push(resolveAssetUrl(assetUrl, sourceMapMatch[1].trim()));
  }
  const parsed = new URL(assetUrl);
  candidates.push(`${assetUrl}.map`);
  candidates.push(new URL(`${parsed.pathname}.map`, assetUrl).toString());
  return unique(candidates);
}

function keywordIndex(js) {
  const result = {};
  for (const keyword of keywordPatterns) {
    const index = js.indexOf(keyword);
    if (index >= 0) {
      result[keyword] = {
        index,
        snippet: js.slice(Math.max(0, index - 120), Math.min(js.length, index + 220)),
      };
    }
  }
  return result;
}

async function fetchText(url) {
  const response = await fetch(url, {
    headers: {
      'user-agent': 'pareto-sio-asset-discovery/1.0',
    },
  });
  const text = await response.text();
  return {
    ok: response.ok,
    status: response.status,
    contentType: response.headers.get('content-type') ?? '',
    bytes: Buffer.byteLength(text),
    text,
  };
}

async function writeMirror(url, text, extensionHint = '') {
  await fs.mkdir(mirrorDir, { recursive: true });
  const filename = `${safeAssetName(url)}${extensionHint}`;
  const filePath = path.join(mirrorDir, filename);
  await fs.writeFile(filePath, text);
  return path.relative(process.cwd(), filePath);
}

async function main() {
  await fs.mkdir(outputDir, { recursive: true });
  await fs.rm(mirrorDir, { recursive: true, force: true });

  const errors = [];
  const htmlResponse = await fetchText(sourceUrl);
  if (!htmlResponse.ok) {
    throw new Error(`failed to fetch ${sourceUrl}: HTTP ${htmlResponse.status}`);
  }

  const jsAssets = extractAssetCandidates(htmlResponse.text, sourceUrl);
  const fetchedAssets = [];
  const discoveredFromJs = [];
  const sourceMapProbeResults = [];
  const keywordIndexes = {};

  for (const assetUrl of jsAssets) {
    try {
      const response = await fetchText(assetUrl);
      if (!response.ok) {
        errors.push({ url: assetUrl, status: response.status, phase: 'js-fetch' });
        continue;
      }
      const mirrorPath = await writeMirror(assetUrl, response.text);
      const chunkCandidates = extractChunkCandidatesFromJs(response.text, assetUrl);
      discoveredFromJs.push(...chunkCandidates);
      const maps = sourceMapCandidates(assetUrl, response.text);
      const keywords = keywordIndex(response.text);
      keywordIndexes[assetUrl] = keywords;
      fetchedAssets.push({
        url: assetUrl,
        status: response.status,
        bytes: response.bytes,
        contentType: response.contentType,
        mirrorPath,
        chunkCandidates,
        sourceMapCandidates: maps,
        keywordHits: Object.keys(keywords),
      });
    } catch (error) {
      errors.push({ url: assetUrl, message: String(error), phase: 'js-fetch' });
    }
  }

  const allAssetCandidates = unique([...jsAssets, ...discoveredFromJs]);
  const unfetchedDiscovered = allAssetCandidates.filter((url) => !jsAssets.includes(url));
  for (const assetUrl of unfetchedDiscovered) {
    try {
      const response = await fetchText(assetUrl);
      if (!response.ok) {
        errors.push({ url: assetUrl, status: response.status, phase: 'discovered-js-fetch' });
        continue;
      }
      const mirrorPath = await writeMirror(assetUrl, response.text);
      const maps = sourceMapCandidates(assetUrl, response.text);
      const keywords = keywordIndex(response.text);
      keywordIndexes[assetUrl] = keywords;
      fetchedAssets.push({
        url: assetUrl,
        status: response.status,
        bytes: response.bytes,
        contentType: response.contentType,
        mirrorPath,
        chunkCandidates: extractChunkCandidatesFromJs(response.text, assetUrl),
        sourceMapCandidates: maps,
        keywordHits: Object.keys(keywords),
      });
    } catch (error) {
      errors.push({ url: assetUrl, message: String(error), phase: 'discovered-js-fetch' });
    }
  }

  const mapCandidates = unique(fetchedAssets.flatMap((asset) => asset.sourceMapCandidates));
  for (const mapUrl of mapCandidates) {
    try {
      const response = await fetchText(mapUrl);
      const item = {
        url: mapUrl,
        status: response.status,
        ok: response.ok,
        bytes: response.bytes,
        contentType: response.contentType,
      };
      if (response.ok && response.text.trim().startsWith('{')) {
        item.mirrorPath = await writeMirror(mapUrl, response.text, '.map');
      }
      sourceMapProbeResults.push(item);
    } catch (error) {
      sourceMapProbeResults.push({ url: mapUrl, ok: false, message: String(error) });
    }
  }

  const workerAssetCandidates = fetchedAssets.filter(
    (asset) =>
      /worker|skills/i.test(asset.url) ||
      asset.keywordHits.includes('importScripts') ||
      asset.keywordHits.includes('worker'),
  );
  const sourceMapsFound = sourceMapProbeResults.filter((item) => item.ok && item.mirrorPath);
  const summary = {
    status: sourceMapsFound.length > 0 ? 'source-maps-found' : 'source-maps-not-found',
    sourceUrl,
    fetchedAt: new Date().toISOString(),
    htmlBytes: htmlResponse.bytes,
    jsAssetsDiscovered: allAssetCandidates.length,
    jsAssetsFetched: fetchedAssets.length,
    workerAssetCandidates: workerAssetCandidates.map((asset) => ({
      url: asset.url,
      bytes: asset.bytes,
      mirrorPath: asset.mirrorPath,
      keywordHits: asset.keywordHits,
    })),
    sourceMapCandidates: mapCandidates,
    sourceMapsFound,
    notFoundSourceMaps: sourceMapProbeResults.filter((item) => !item.ok),
    fetchedAssets,
    keywordIndexes,
    errors,
    decision:
      sourceMapsFound.length > 0
        ? 'Use mirrored source maps to extract authoritative formulas before considering fullSioEquivalent.'
        : 'Public assets were mirrored, but probed source maps were not available; continue minified-bundle reverse indexing and later cross-check with user-provided DevTools exports.',
  };

  const report = [
    '# SIO Tools Asset Discovery Report',
    '',
    `Status: \`${summary.status}\``,
    '',
    `Source URL: ${sourceUrl}`,
    `Fetched at: ${summary.fetchedAt}`,
    `HTML bytes: ${summary.htmlBytes}`,
    `JS assets discovered: ${summary.jsAssetsDiscovered}`,
    `JS assets fetched: ${summary.jsAssetsFetched}`,
    `Worker asset candidates: ${summary.workerAssetCandidates.length}`,
    `Source map candidates probed: ${summary.sourceMapCandidates.length}`,
    `Source maps found: ${summary.sourceMapsFound.length}`,
    '',
    '## Worker Candidates',
    '',
    ...summary.workerAssetCandidates.map(
      (asset) => `- ${asset.url} (${asset.bytes} bytes) -> \`${asset.mirrorPath}\``,
    ),
    '',
    '## Source Map Results',
    '',
    ...(summary.sourceMapsFound.length > 0
      ? summary.sourceMapsFound.map((item) => `- FOUND ${item.url} -> \`${item.mirrorPath}\``)
      : ['- No source maps found for probed candidates.']),
    '',
    '## Decision',
    '',
    summary.decision,
    '',
  ].join('\n');

  await fs.writeFile(summaryPath, `${JSON.stringify(summary, null, 2)}\n`);
  await fs.writeFile(reportPath, report);
  console.log(
    JSON.stringify(
      {
        summaryPath,
        reportPath,
        status: summary.status,
        jsAssetsFetched: summary.jsAssetsFetched,
        workerAssetCandidates: summary.workerAssetCandidates.length,
        sourceMapsFound: summary.sourceMapsFound.length,
        errors: summary.errors.length,
      },
      null,
      2,
    ),
  );
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});

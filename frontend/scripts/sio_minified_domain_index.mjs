import fs from 'node:fs/promises';
import path from 'node:path';

const discoverySummaryPath =
  process.env.DISCOVERY_SUMMARY_PATH ??
  path.join(process.cwd(), 'artifacts/td11/sio_tools_asset_discovery/asset_discovery_summary.json');
const outputDir =
  process.env.OUTPUT_DIR ?? path.join(process.cwd(), 'artifacts/td11/sio_tools_minified_domain_index');
const jsonPath = path.join(outputDir, 'domain_keyword_module_index.json');
const reportPath = path.join(outputDir, 'domain_keyword_module_index.md');

const keywords = [
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

const noisyKeywords = new Set(['ee', 'items', 'stats', 'worker', 'importScripts']);

function basename(value) {
  return path.basename(value);
}

function skipString(source, index) {
  const quote = source[index];
  let cursor = index + 1;
  while (cursor < source.length) {
    if (source[cursor] === '\\') {
      cursor += 2;
      continue;
    }
    if (source[cursor] === quote) {
      return cursor + 1;
    }
    cursor += 1;
  }
  return source.length;
}

function skipComment(source, index) {
  if (source[index + 1] === '/') {
    const end = source.indexOf('\n', index + 2);
    return end >= 0 ? end + 1 : source.length;
  }
  if (source[index + 1] === '*') {
    const end = source.indexOf('*/', index + 2);
    return end >= 0 ? end + 2 : source.length;
  }
  return index;
}

function findWebpackModuleObjectStart(source) {
  const pushIndex = source.indexOf('.push([[');
  if (pushIndex < 0) {
    return -1;
  }
  const objectMarker = source.indexOf('],{', pushIndex);
  return objectMarker >= 0 ? objectMarker + 2 : -1;
}

function extractWebpackModules(source) {
  const objectStart = findWebpackModuleObjectStart(source);
  if (objectStart < 0 || source[objectStart] !== '{') {
    return [];
  }

  const modules = [];
  let cursor = objectStart + 1;
  while (cursor < source.length) {
    while (/[\s,]/.test(source[cursor] ?? '')) {
      cursor += 1;
    }
    if (source[cursor] === '}') {
      break;
    }

    const idStart = cursor;
    while (cursor < source.length && source[cursor] !== ':') {
      if (source[cursor] === '"' || source[cursor] === "'" || source[cursor] === '`') {
        cursor = skipString(source, cursor);
        continue;
      }
      cursor += 1;
    }
    if (cursor >= source.length) {
      break;
    }
    const id = source.slice(idStart, cursor).trim().replace(/^["']|["']$/g, '');
    cursor += 1;

    const valueStart = cursor;
    let depth = 0;
    let valueEnd = source.length;
    while (cursor < source.length) {
      const char = source[cursor];
      if (char === '"' || char === "'" || char === '`') {
        cursor = skipString(source, cursor);
        continue;
      }
      if (char === '/' && (source[cursor + 1] === '/' || source[cursor + 1] === '*')) {
        cursor = skipComment(source, cursor);
        continue;
      }
      if (char === ',' && depth === 0) {
        valueEnd = cursor;
        cursor += 1;
        break;
      }
      if (char === '}' && depth === 0) {
        valueEnd = cursor;
        break;
      }
      if (char === '(' || char === '[' || char === '{') {
        depth += 1;
      } else if (char === ')' || char === ']' || char === '}') {
        depth -= 1;
      }
      cursor += 1;
    }

    modules.push({
      id,
      start: valueStart,
      end: valueEnd,
      bytes: Math.max(0, valueEnd - valueStart),
      source: source.slice(valueStart, valueEnd),
    });
  }
  return modules;
}

function collectKeywordHits(moduleSource, absoluteStart) {
  const hits = {};
  for (const keyword of keywords) {
    let searchStart = 0;
    let count = 0;
    const snippets = [];
    while (searchStart < moduleSource.length) {
      const index = moduleSource.indexOf(keyword, searchStart);
      if (index < 0) {
        break;
      }
      count += 1;
      if (snippets.length < 3) {
        snippets.push({
          absoluteOffset: absoluteStart + index,
          moduleOffset: index,
          snippet: moduleSource.slice(Math.max(0, index - 120), Math.min(moduleSource.length, index + 220)),
        });
      }
      searchStart = index + keyword.length;
    }
    if (count > 0) {
      hits[keyword] = { count, snippets };
    }
  }
  return hits;
}

function scoreHits(hits) {
  return Object.entries(hits).reduce((score, [keyword, data]) => {
    const weight = noisyKeywords.has(keyword) ? 1 : 10;
    return score + weight + Math.min(data.count, 10);
  }, 0);
}

async function main() {
  await fs.mkdir(outputDir, { recursive: true });
  const discovery = JSON.parse(await fs.readFile(discoverySummaryPath, 'utf8'));
  const sourceMapsFound = discovery.sourceMapsFound ?? [];
  const domainModules = [];
  const parseFailures = [];

  for (const asset of discovery.fetchedAssets ?? []) {
    if (!asset.mirrorPath) {
      continue;
    }
    const source = await fs.readFile(asset.mirrorPath, 'utf8');
    const modules = extractWebpackModules(source);
    if (modules.length === 0) {
      parseFailures.push({ url: asset.url, mirrorPath: asset.mirrorPath, reason: 'webpack module object not found' });
      continue;
    }
    for (const module of modules) {
      const hits = collectKeywordHits(module.source, module.start);
      const hitKeywords = Object.keys(hits);
      if (hitKeywords.length === 0) {
        continue;
      }
      domainModules.push({
        assetUrl: asset.url,
        mirrorPath: asset.mirrorPath,
        assetFile: basename(asset.mirrorPath),
        moduleId: module.id,
        moduleStart: module.start,
        moduleEnd: module.end,
        bytes: module.bytes,
        hitKeywords,
        score: scoreHits(hits),
        hits,
      });
    }
  }

  domainModules.sort((left, right) => right.score - left.score || right.hitKeywords.length - left.hitKeywords.length);

  const summary = {
    status: sourceMapsFound.length > 0 ? 'source-maps-found' : 'source-maps-not-found',
    generatedAt: new Date().toISOString(),
    discoverySummaryPath,
    sourceMapsFound,
    assetCount: (discovery.fetchedAssets ?? []).length,
    parsedAssetFailures: parseFailures,
    domainModuleCount: domainModules.length,
    topModules: domainModules.slice(0, 50),
    decision:
      'Minified Webpack modules were indexed by domain keyword to guide formula extraction; this does not prove source equivalence.',
  };

  await fs.writeFile(jsonPath, `${JSON.stringify(summary, null, 2)}\n`);

  const lines = [
    '# SIO Tools Minified Domain Module Index',
    '',
    `Status: \`${summary.status}\``,
    '',
    `Generated at: ${summary.generatedAt}`,
    `Discovery summary: \`${discoverySummaryPath}\``,
    `Assets scanned: ${summary.assetCount}`,
    `Domain modules indexed: ${summary.domainModuleCount}`,
    `Source maps found: ${sourceMapsFound.length}`,
    '',
    '## Top Modules',
    '',
    ...summary.topModules.slice(0, 20).map((module, index) => {
      return `${index + 1}. \`${module.assetFile}\` module \`${module.moduleId}\` score ${module.score}: ${module.hitKeywords.join(', ')}`;
    }),
    '',
    '## Decision',
    '',
    summary.decision,
  ];
  if (parseFailures.length > 0) {
    lines.push('', '## Parse Failures', '');
    for (const failure of parseFailures) {
      lines.push(`- \`${basename(failure.mirrorPath)}\`: ${failure.reason}`);
    }
  }
  await fs.writeFile(reportPath, `${lines.join('\n')}\n`);

  console.log(
    JSON.stringify(
      {
        jsonPath,
        reportPath,
        status: summary.status,
        assetCount: summary.assetCount,
        domainModuleCount: summary.domainModuleCount,
        sourceMapsFound: sourceMapsFound.length,
      },
      null,
      2,
    ),
  );
}

await main();

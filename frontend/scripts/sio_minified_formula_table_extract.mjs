import fs from 'node:fs/promises';
import path from 'node:path';
import vm from 'node:vm';
import { webcrypto } from 'node:crypto';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const terser = require('next/dist/compiled/terser/bundle.min.js');

const mirrorDir =
  process.env.MIRROR_DIR ??
  path.join(process.cwd(), 'artifacts/td11/sio_tools_asset_discovery/mirrored_assets');
const outputDir =
  process.env.OUTPUT_DIR ?? path.join(process.cwd(), 'artifacts/td11/sio_tools_formula_table_extract');
const tableDir = path.join(outputDir, 'extracted_tables');
const formulaDir = path.join(outputDir, 'formula_snippets');
const jsonPath = path.join(outputDir, 'formula_table_runtime_exports.json');
const reportPath = path.join(outputDir, 'formula_table_runtime_exports.md');
const formulaModuleIds = {
  module5005: { id: '5005', label: 'synergyThresholdStats' },
  module5834: { id: '5834', label: 'percentMultiplier' },
  module40498: { id: '40498', label: 'lmeThresholdStats' },
  module42806: { id: '42806', label: 'customSetsStats' },
  module57223: { id: '57223', label: 'collectiblesStats' },
  module24804: { id: '24804', label: 'equipmentItemStats' },
  module30396: { id: '30396', label: 'cooldownReduction' },
  module67727: { id: '67727', label: 'finalScoreProduct' },
};

function createRuntimeSandbox(capturedChunks) {
  const webpackChunk = [];
  webpackChunk.push = (chunk) => {
    capturedChunks.push(chunk);
    return Array.prototype.push.call(webpackChunk, chunk);
  };

  const documentStub = {
    body: {
      addEventListener() {},
      appendChild() {},
      removeEventListener() {},
      removeChild() {},
      style: {},
    },
    documentElement: {
      addEventListener() {},
      clientHeight: 0,
      removeEventListener() {},
      style: {},
    },
    addEventListener() {},
    createElement() {
      return {
        addEventListener() {},
        style: {},
        appendChild() {},
        getBoundingClientRect() {
          return { width: 0, height: 0, left: 0, top: 0, right: 0, bottom: 0 };
        },
        removeEventListener() {},
        removeChild() {},
        setAttribute() {},
        offsetWidth: 0,
        clientWidth: 0,
        offsetHeight: 0,
        clientHeight: 0,
      };
    },
    querySelector() {
      return null;
    },
    removeEventListener() {},
  };

  const sandbox = {
    AbortController: globalThis.AbortController,
    Blob: globalThis.Blob,
    clearTimeout,
    console,
    crypto: globalThis.crypto ?? webcrypto,
    document: documentStub,
    fetch,
    getComputedStyle() {
      return {};
    },
    innerHeight: 0,
    innerWidth: 0,
    navigator: { userAgent: 'pareto-sio-runtime-extractor' },
    removeEventListener() {},
    addEventListener() {},
    setTimeout,
    URL,
    Worker: class UnsupportedWorker {},
    webpackChunk_N_E: webpackChunk,
  };
  sandbox.globalThis = sandbox;
  sandbox.self = sandbox;
  sandbox.window = sandbox;
  return sandbox;
}

async function loadWebpackModules() {
  const capturedChunks = [];
  const sandbox = createRuntimeSandbox(capturedChunks);
  const context = vm.createContext(sandbox);
  const evalErrors = [];
  const files = (await fs.readdir(mirrorDir)).filter((file) => file.endsWith('.js')).sort();

  for (const file of files) {
    const filePath = path.join(mirrorDir, file);
    const source = await fs.readFile(filePath, 'utf8');
    try {
      vm.runInContext(source, context, { filename: file, timeout: 1_000 });
    } catch (error) {
      evalErrors.push({ file, message: String(error.message ?? error) });
    }
  }

  const modules = {};
  const moduleFiles = {};
  for (const chunk of capturedChunks) {
    const chunkModules = chunk?.[1] ?? {};
    for (const [id, fn] of Object.entries(chunkModules)) {
      if (!modules[id]) {
        modules[id] = fn;
        moduleFiles[id] = files.find(() => true) ?? null;
      }
    }
  }

  return { modules, evalErrors, files };
}

function makeRequire(modules) {
  const cache = {};

  function requireModule(id) {
    const key = String(id);
    if (cache[key]) {
      return cache[key].exports;
    }
    const moduleFactory = modules[key];
    if (!moduleFactory) {
      throw new Error(`missing webpack module ${key}`);
    }
    const module = { exports: {} };
    cache[key] = module;
    moduleFactory(module, module.exports, requireModule);
    return module.exports;
  }

  requireModule.d = (exports, definition) => {
    for (const key of Object.keys(definition)) {
      if (!Object.prototype.hasOwnProperty.call(exports, key)) {
        Object.defineProperty(exports, key, {
          enumerable: true,
          get: definition[key],
        });
      }
    }
  };
  requireModule.e = () => Promise.resolve();
  requireModule.n = (module) => {
    const getter = module && module.__esModule ? () => module.default : () => module;
    requireModule.d(getter, { a: getter });
    return getter;
  };
  requireModule.o = (object, property) => Object.prototype.hasOwnProperty.call(object, property);
  requireModule.p = '';
  requireModule.r = (exports) => {
    Object.defineProperty(exports, Symbol.toStringTag, { value: 'Module' });
    Object.defineProperty(exports, '__esModule', { value: true });
  };
  requireModule.t = (value, mode) => {
    if (mode & 1) {
      value = requireModule(value);
    }
    if (mode & 8) {
      return value;
    }
    if (mode & 4 && value && value.__esModule) {
      return value;
    }
    const namespace = Object.create(null);
    requireModule.r(namespace);
    Object.defineProperty(namespace, 'default', { enumerable: true, value });
    if (mode & 2 && typeof value !== 'string') {
      for (const key in value) {
        requireModule.d(namespace, { [key]: () => value[key] });
      }
    }
    return namespace;
  };
  requireModule.u = (id) => `${id}.js`;

  return requireModule;
}

function sortedKeys(value) {
  return value && typeof value === 'object' ? Object.keys(value).sort() : [];
}

function tableCounts(table) {
  return Object.fromEntries(
    Object.entries(table).map(([key, value]) => [
      key,
      value && typeof value === 'object' ? Object.keys(value).length : null,
    ]),
  );
}

function beautifyFunction(fn) {
  const source = fn.toString();
  try {
    return terser.minify_sync(`const __formula = ${source};`, {
      compress: false,
      mangle: false,
      format: { beautify: true, comments: false, width: 100 },
    }).code;
  } catch {
    return source;
  }
}

function beautifyModuleFactory(fn) {
  const source = fn.toString();
  try {
    return terser.minify_sync(`const __module = ${source};`, {
      compress: false,
      mangle: false,
      format: { beautify: true, comments: false, width: 120 },
    }).code;
  } catch {
    return `const __module = ${source};`;
  }
}

function extractExportLocalMap(moduleSource) {
  const exportLocalMap = {};
  const exportBlockMatch = moduleSource.match(/\.d\([^,]+,\s*\{([\s\S]*?)\}\);/);
  if (!exportBlockMatch) {
    return exportLocalMap;
  }
  const exportBlock = exportBlockMatch[1];
  for (const match of exportBlock.matchAll(/([A-Za-z_$][\w$]*):\s*\(\)\s*=>\s*([A-Za-z_$][\w$]*)/g)) {
    exportLocalMap[match[1]] = match[2];
  }
  return exportLocalMap;
}

function extractInternalFormulaCandidates(prettySource) {
  const keywords = [
    'damage',
    'damageFactor',
    'critDamage',
    'critRate',
    'passivePools',
    'ceDamage',
    'skillDamage',
    'bossDamage',
    'collectibles',
    'customSets',
    'petSkills',
    'xeno',
    'mounts',
    'lme',
    'ee',
  ];
  const candidates = [];
  for (const keyword of keywords) {
    let searchStart = 0;
    let count = 0;
    while (searchStart < prettySource.length && count < 5) {
      const index = prettySource.indexOf(keyword, searchStart);
      if (index < 0) {
        break;
      }
      const windowStart = Math.max(0, index - 900);
      const windowEnd = Math.min(prettySource.length, index + 1_500);
      const window = prettySource.slice(windowStart, windowEnd);
      const functionNameMatch =
        window.match(/function\s+([A-Za-z_$][\w$]*)\s*\([^)]*\)\s*\{[^{}]*$/) ??
        window.match(/(?:let|const|var)\s+([A-Za-z_$][\w$]*)\s*=/);
      candidates.push({
        keyword,
        offset: index,
        nearbyFunctionOrBinding: functionNameMatch?.[1] ?? null,
        arithmeticOperatorCount: (window.match(/[+\-*/%]=?|=>/g) ?? []).length,
        snippet: window,
      });
      searchStart = index + keyword.length;
      count += 1;
    }
  }
  candidates.sort(
    (left, right) =>
      right.arithmeticOperatorCount - left.arithmeticOperatorCount || left.offset - right.offset,
  );
  return candidates;
}

function summarizeExportValue(value) {
  if (typeof value === 'function') {
    const source = value.toString();
    return {
      kind: 'function',
      name: value.name || null,
      sourceBytes: Buffer.byteLength(source),
      sourcePreview: source.slice(0, 400),
    };
  }
  if (Array.isArray(value)) {
    return {
      kind: 'array',
      length: value.length,
      first: value.slice(0, 3),
    };
  }
  if (value && typeof value === 'object') {
    return {
      kind: 'object',
      keyCount: Object.keys(value).length,
      keys: Object.keys(value).slice(0, 60),
    };
  }
  return { kind: typeof value, value };
}

function extractRuntimeExports(requireModule, moduleId) {
  const exports = requireModule(moduleId);
  return {
    moduleId,
    exportKeys: Object.keys(exports),
    exports,
    summaries: Object.fromEntries(
      Object.entries(exports).map(([key, value]) => [key, summarizeExportValue(value)]),
    ),
  };
}

async function writeJson(filePath, value) {
  await fs.mkdir(path.dirname(filePath), { recursive: true });
  await fs.writeFile(filePath, `${JSON.stringify(value, null, 2)}\n`);
  return filePath;
}

async function extractKeyFormulaModuleArtifacts(modules, requireModule) {
  const keyFormulaModules = {};
  for (const [key, descriptor] of Object.entries(formulaModuleIds)) {
    const moduleFactory = modules[descriptor.id];
    if (!moduleFactory) {
      keyFormulaModules[key] = {
        ...descriptor,
        status: 'missing',
      };
      continue;
    }

    const fullPrettyPath = path.join(formulaDir, `${key}_${descriptor.label}_full_pretty.js`);
    await fs.writeFile(fullPrettyPath, `${beautifyModuleFactory(moduleFactory)}\n`);

    try {
      const runtimeExports = extractRuntimeExports(requireModule, descriptor.id);
      const exportFunctionPaths = {};
      for (const [exportKey, value] of Object.entries(runtimeExports.exports)) {
        if (typeof value !== 'function') {
          continue;
        }
        const functionPath = path.join(formulaDir, `${key}_${descriptor.label}_${exportKey}.js`);
        await fs.writeFile(functionPath, `${beautifyFunction(value)}\n`);
        exportFunctionPaths[exportKey] = functionPath;
      }
      keyFormulaModules[key] = {
        ...descriptor,
        status: 'extracted',
        exportKeys: runtimeExports.exportKeys,
        exportSummaries: runtimeExports.summaries,
        fullPrettyPath,
        exportFunctionPaths,
      };
    } catch (error) {
      keyFormulaModules[key] = {
        ...descriptor,
        status: 'runtime-export-failed',
        fullPrettyPath,
        message: String(error.message ?? error),
      };
    }
  }
  return keyFormulaModules;
}

async function main() {
  await fs.mkdir(outputDir, { recursive: true });
  await fs.mkdir(tableDir, { recursive: true });
  await fs.mkdir(formulaDir, { recursive: true });

  const { modules, evalErrors, files } = await loadWebpackModules();
  const requireModule = makeRequire(modules);

  const module37013 = extractRuntimeExports(requireModule, '37013');
  const module91252 = extractRuntimeExports(requireModule, '91252');
  const module32085 = extractRuntimeExports(requireModule, '32085');
  const module73755 = extractRuntimeExports(requireModule, '73755');
  const keyFormulaModules = await extractKeyFormulaModuleArtifacts(modules, requireModule);

  const deployedDataTable = module37013.exports.c;
  const deployedDefaultConfig = module37013.exports.f;
  const damageCoefficientTable = module32085.exports.mg;

  if (!deployedDataTable?.heroes || !deployedDataTable?.collectibles || !deployedDataTable?.items) {
    throw new Error('module37013 deployed data table is missing expected heroes/collectibles/items');
  }
  if (damageCoefficientTable?.['Drill Shot Mode'] !== 36.8) {
    throw new Error('module32085 damage coefficient table does not expose live Drill Shot Mode coefficient 36.8');
  }
  if (keyFormulaModules.module67727?.status !== 'extracted') {
    throw new Error('module67727 final score formula module was not extracted');
  }

  const tablePaths = {
    module37013DataTable: await writeJson(
      path.join(tableDir, 'module37013_c_deployed_data_table.json'),
      deployedDataTable,
    ),
    module37013DefaultConfig: await writeJson(
      path.join(tableDir, 'module37013_f_default_config.json'),
      deployedDefaultConfig,
    ),
    module32085DamageCoefficients: await writeJson(
      path.join(tableDir, 'module32085_mg_damage_coefficients.json'),
      damageCoefficientTable,
    ),
  };

  const module32085Source = modules['32085'].toString();
  const module32085Pretty = beautifyModuleFactory(modules['32085']);
  const module32085FullPrettyPath = path.join(formulaDir, 'module32085_full_pretty.js');
  const module32085ExportLocalMapPath = path.join(tableDir, 'module32085_export_local_map.json');
  const module32085ExportLocalMap = extractExportLocalMap(module32085Source);
  const internalFormulaCandidates = extractInternalFormulaCandidates(module32085Pretty);
  await fs.writeFile(module32085FullPrettyPath, `${module32085Pretty}\n`);
  await writeJson(module32085ExportLocalMapPath, module32085ExportLocalMap);

  const helperFormulaPaths = {};
  for (const [key, value] of Object.entries(module91252.exports)) {
    if (typeof value === 'function') {
      const filePath = path.join(formulaDir, `module91252_${key}.js`);
      await fs.writeFile(filePath, `${beautifyFunction(value)}\n`);
      helperFormulaPaths[`module91252.${key}`] = filePath;
    }
  }
  for (const [key, value] of Object.entries(module73755.exports)) {
    if (typeof value === 'function') {
      const filePath = path.join(formulaDir, `module73755_${key}.js`);
      await fs.writeFile(filePath, `${beautifyFunction(value)}\n`);
      helperFormulaPaths[`module73755.${key}`] = filePath;
    }
  }
  const module32085FormulaPaths = {};
  const formulaCandidateExports = [];
  for (const [key, value] of Object.entries(module32085.exports)) {
    if (typeof value !== 'function') {
      continue;
    }
    const source = value.toString();
    const filePath = path.join(formulaDir, `module32085_${key}.js`);
    await fs.writeFile(filePath, `${beautifyFunction(value)}\n`);
    module32085FormulaPaths[`module32085.${key}`] = filePath;
    formulaCandidateExports.push({
      exportKey: key,
      filePath,
      sourceBytes: Buffer.byteLength(source),
      arithmeticOperatorCount: (source.match(/[+\-*/%]=?|=>/g) ?? []).length,
      domainKeywordHits: [
        'damage',
        'crit',
        'skill',
        'passive',
        'collectibles',
        'customSets',
        'petSkills',
        'xeno',
        'mounts',
        'lme',
        'ee',
      ].filter((keyword) => source.includes(keyword)),
    });
  }
  formulaCandidateExports.sort(
    (left, right) =>
      right.domainKeywordHits.length - left.domainKeywordHits.length ||
      right.arithmeticOperatorCount - left.arithmeticOperatorCount ||
      right.sourceBytes - left.sourceBytes,
  );

  const summary = {
    status: '[MINIFIED-FORMULA-TABLE-RUNTIME-EXPORTS-GREEN-NOT-FULL-SIO]',
    generatedAt: new Date().toISOString(),
    fullSioEquivalent: false,
    mirrorDir,
    mirroredFiles: files.length,
    loadedWebpackModules: Object.keys(modules).length,
    evalErrors,
    tablePaths,
    helperFormulaPaths,
    module32085FormulaPaths,
    formulaCandidateExports,
    internalFormulaCandidates,
    keyFormulaModules,
    modules: {
      module37013: {
        moduleId: module37013.moduleId,
        exportKeys: module37013.exportKeys,
        deployedDataTableTopLevelCounts: tableCounts(deployedDataTable),
        deployedDataTableTopLevelKeys: sortedKeys(deployedDataTable),
        sampleKeys: {
          heroes: sortedKeys(deployedDataTable.heroes).slice(0, 30),
          collectibles: sortedKeys(deployedDataTable.collectibles).slice(0, 30),
          items: sortedKeys(deployedDataTable.items),
          techs: sortedKeys(deployedDataTable.techs),
          pets: sortedKeys(deployedDataTable.pets),
          mounts: sortedKeys(deployedDataTable.mounts),
          customSets: sortedKeys(deployedDataTable.customSets),
        },
      },
      module32085: {
        moduleId: module32085.moduleId,
        exportKeys: module32085.exportKeys,
        damageCoefficientCount: Object.keys(damageCoefficientTable).length,
        damageCoefficientTable,
        formulaSnippetCount: Object.keys(module32085FormulaPaths).length,
        topFormulaCandidateExports: formulaCandidateExports.slice(0, 20),
        fullPrettyPath: module32085FullPrettyPath,
        exportLocalMapPath: module32085ExportLocalMapPath,
        exportLocalMap: module32085ExportLocalMap,
        internalFormulaCandidateCount: internalFormulaCandidates.length,
        topInternalFormulaCandidates: internalFormulaCandidates.slice(0, 20).map((candidate) => ({
          keyword: candidate.keyword,
          offset: candidate.offset,
          nearbyFunctionOrBinding: candidate.nearbyFunctionOrBinding,
          arithmeticOperatorCount: candidate.arithmeticOperatorCount,
          snippetPreview: candidate.snippet.slice(0, 500),
        })),
      },
      module91252: {
        moduleId: module91252.moduleId,
        exportKeys: module91252.exportKeys,
        exportSummaries: module91252.summaries,
      },
      module73755: {
        moduleId: module73755.moduleId,
        exportKeys: module73755.exportKeys,
        exportSummaries: module73755.summaries,
      },
    },
    decision:
      'Runtime exports from deployed minified modules are decoded into local table/formula artifacts. These artifacts are extraction evidence only and do not flip fullSioEquivalent.',
  };

  await writeJson(jsonPath, summary);

  const lines = [
    '# SIO Tools Formula/Table Runtime Export Extraction',
    '',
    `Status: \`${summary.status}\``,
    '',
    `Generated at: ${summary.generatedAt}`,
    `Mirrored files scanned: ${summary.mirroredFiles}`,
    `Webpack modules loaded: ${summary.loadedWebpackModules}`,
    `fullSioEquivalent: \`${summary.fullSioEquivalent}\``,
    '',
    '## Module 37013: Deployed Data Table',
    '',
    `Exports: ${module37013.exportKeys.join(', ')}`,
    '',
    '| Domain | Count |',
    '| --- | ---: |',
    ...Object.entries(summary.modules.module37013.deployedDataTableTopLevelCounts).map(
      ([key, count]) => `| ${key} | ${count ?? ''} |`,
    ),
    '',
    `Table JSON: \`${tablePaths.module37013DataTable}\``,
    '',
    '## Module 32085: Damage Coefficients',
    '',
    `Coefficient count: ${summary.modules.module32085.damageCoefficientCount}`,
    '',
    '| Name | Coefficient |',
    '| --- | ---: |',
    ...Object.entries(damageCoefficientTable).map(([key, value]) => `| ${key} | ${value} |`),
    '',
    `Table JSON: \`${tablePaths.module32085DamageCoefficients}\``,
    '',
    '## Module 32085 Formula Export Snippets',
    '',
    `Function exports extracted: ${Object.keys(module32085FormulaPaths).length}`,
    `Full pretty module: \`${module32085FullPrettyPath}\``,
    `Export-to-local map: \`${module32085ExportLocalMapPath}\``,
    '',
    '| Export | Source bytes | Arithmetic ops | Domain hits |',
    '| --- | ---: | ---: | --- |',
    ...formulaCandidateExports
      .slice(0, 30)
      .map(
        (item) =>
          `| ${item.exportKey} | ${item.sourceBytes} | ${item.arithmeticOperatorCount} | ${item.domainKeywordHits.join(', ')} |`,
      ),
    '',
    '## Module 32085 Internal Formula Candidates',
    '',
    `Internal keyword windows extracted: ${internalFormulaCandidates.length}`,
    '',
    '| Keyword | Offset | Nearby binding | Arithmetic ops |',
    '| --- | ---: | --- | ---: |',
    ...internalFormulaCandidates
      .slice(0, 30)
      .map(
        (item) =>
          `| ${item.keyword} | ${item.offset} | ${item.nearbyFunctionOrBinding ?? ''} | ${item.arithmeticOperatorCount} |`,
      ),
    '',
    '## Key Formula Modules',
    '',
    '| Module | Label | Status | Exports |',
    '| --- | --- | --- | --- |',
    ...Object.entries(keyFormulaModules).map(([key, module]) => {
      return `| ${key} / ${module.id} | ${module.label} | ${module.status} | ${(module.exportKeys ?? []).join(', ')} |`;
    }),
    '',
    ...Object.entries(keyFormulaModules).flatMap(([key, module]) => {
      const lines = [`- ${key} full source: \`${module.fullPrettyPath ?? ''}\``];
      for (const [exportKey, filePath] of Object.entries(module.exportFunctionPaths ?? {})) {
        lines.push(`- ${key}.${exportKey}: \`${filePath}\``);
      }
      return lines;
    }),
    '',
    '## Formula Helper Snippets',
    '',
    ...Object.entries(helperFormulaPaths).map(([key, filePath]) => `- ${key}: \`${filePath}\``),
    ...Object.entries(module32085FormulaPaths)
      .slice(0, 30)
      .map(([key, filePath]) => `- ${key}: \`${filePath}\``),
    '',
    '## Decision',
    '',
    summary.decision,
  ];

  if (evalErrors.length > 0) {
    lines.push('', '## Chunk Registration Eval Errors', '');
    for (const error of evalErrors) {
      lines.push(`- \`${error.file}\`: ${error.message}`);
    }
  }

  await fs.writeFile(reportPath, `${lines.join('\n')}\n`);

  console.log(
    JSON.stringify(
      {
        jsonPath,
        reportPath,
        status: summary.status,
        loadedWebpackModules: summary.loadedWebpackModules,
        tableCounts: summary.modules.module37013.deployedDataTableTopLevelCounts,
        damageCoefficientCount: summary.modules.module32085.damageCoefficientCount,
        fullSioEquivalent: summary.fullSioEquivalent,
      },
      null,
      2,
    ),
  );
}

await main();

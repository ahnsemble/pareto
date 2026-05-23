import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';

const root = process.cwd();
const repoRoot = path.join(root, '..');
const writeMode = process.argv.includes('--write');
const jsonPath = path.join(root, 'artifacts/td11/tangtang_first_party_description_source_inventory.json');
const mdPath = path.join(root, 'artifacts/td11/tangtang_first_party_description_source_inventory.md');
const execFileAsync = promisify(execFile);

const SOURCE_INPUTS = [
  'frontend/artifacts/td11/tangtang_description_formula_validation_matrix.json',
  'frontend/artifacts/td11/tangtang_description_formula_validation_protocol.md',
  'frontend/artifacts/td11/tangtang_description_capture_inbox.json',
  'frontend/artifacts/td11/tangtang_description_capture_import_matrix.json',
  'frontend/artifacts/td11/tangtang_description_capture_import_protocol.md',
  'frontend/artifacts/td11/tangtang_damage_formula_spec.json',
  'frontend/artifacts/td11/in_game_description_evidence_matrix.json',
];

const FIRST_PARTY_REQUIRED_FIELDS = [
  'captureId',
  'atomRowId',
  'captureDateKst',
  'gameVersion',
  'sourceKind',
  'captureEvidenceTier',
  'language',
  'descriptionTextOriginal',
  'rawCaptureArtifactPaths',
  'parsedFormulaOperation',
  'parsedFormulaValue',
  'operationBucket',
  'conditionOrThreshold',
  'rustStatChannel',
  'multiplierStage',
];

const RECOMMENDED_CAPTURE_FIELDS = [
  ...FIRST_PARTY_REQUIRED_FIELDS,
  'entityDisplayNameCaptured',
  'screenContext',
  'devicePlatform',
  'ocrTextRaw',
  'descriptionTextManualTranscription',
  'descriptionTextEnglishTranslation',
  'transcriptionConfidence',
  'transcriptionNotes',
];

const EXPECTED_CAPTURE_ROWS = 9;

const OFFICIAL_PUBLIC_SOURCE_CANDIDATES = [
  {
    sourceId: 'habby-official-game-page',
    label: 'Habby official game page',
    sourceKind: 'official-public-page',
    url: 'https://www.habby.com/game',
    observedContent:
      'Generic Habby game-card listing and product copy; JavaScript-rendered public page does not expose row-level item/effect descriptions.',
    containsStructuredItemEffectDescriptions: false,
    canPopulateDirectFirstPartyCaptureRows: false,
    eligibleUse: 'release/existence provenance only',
  },
  {
    sourceId: 'habby-store-survivor-page',
    label: 'Habby Store Survivor.io page',
    sourceKind: 'official-public-store-page',
    url: 'https://store.habby.com/game/3',
    observedContent:
      'Official purchase/store page with packs, Dreamstars, gift-code flow, and download links; no structured formula rows.',
    containsStructuredItemEffectDescriptions: false,
    canPopulateDirectFirstPartyCaptureRows: false,
    eligibleUse: 'release/store provenance only',
  },
  {
    sourceId: 'apple-app-store-survivor-page',
    label: 'Apple App Store listing',
    sourceKind: 'official-platform-listing',
    url: 'https://apps.apple.com/us/app/survivor-io/id1528941310',
    observedContent:
      'Developer listing, general game copy, events, and version-history blurbs; no complete item/effect description table.',
    containsStructuredItemEffectDescriptions: false,
    canPopulateDirectFirstPartyCaptureRows: false,
    eligibleUse: 'version/release provenance only',
  },
  {
    sourceId: 'google-play-survivor-page',
    label: 'Google Play listing',
    sourceKind: 'official-platform-listing',
    url: 'https://play.google.com/store/apps/details?id=com.dxx.firenow&hl=en-US',
    observedContent:
      'Developer listing, general game copy, current update notes, and support contacts; no complete item/effect description table.',
    containsStructuredItemEffectDescriptions: false,
    canPopulateDirectFirstPartyCaptureRows: false,
    eligibleUse: 'version/release provenance only',
  },
  {
    sourceId: 'official-discord-public-landing',
    label: 'Official Discord public landing',
    sourceKind: 'official-community-public-landing',
    url: 'https://discord.com/servers/survivor-io-1008984622941601882',
    observedContent:
      'Public listing confirms an official community and mentions equipment/weapon tier-list channels, but public landing does not expose channel contents.',
    containsStructuredItemEffectDescriptions: false,
    canPopulateDirectFirstPartyCaptureRows: false,
    eligibleUse: 'community provenance only; authenticated first-party channel captures would need a separate raw artifact',
  },
  {
    sourceId: 'official-facebook-energy-guidance-forcefield',
    label: 'Official Facebook Energy Guidance System announcement',
    sourceKind: 'official-social-announcement',
    url:
      'https://www.facebook.com/SurvivorHabby/posts/-greetings-survivorsthe-twinborn-parts-energy-guidance-system-forcefield-mode-is/692695606793477/',
    observedContent:
      'Search-indexed first-party announcement mentions feature launch, transform/evolve framing, and says detailed information should be checked in-game.',
    containsStructuredItemEffectDescriptions: false,
    canPopulateDirectFirstPartyCaptureRows: false,
    eligibleUse: 'announcement-level provenance only',
  },
  {
    sourceId: 'official-facebook-antimatter-maintainer',
    label: 'Official Facebook Antimatter Maintainer announcement',
    sourceKind: 'official-social-announcement',
    url:
      'https://www.facebook.com/SurvivorHabby/posts/-greetings-survivorsthe-twinborn-part-antimatter-maintainer-launches-july-13-at-/734749099254794/',
    observedContent:
      'Search-indexed first-party announcement appears effect-adjacent, but not a complete item/effect formula row source.',
    containsStructuredItemEffectDescriptions: false,
    canPopulateDirectFirstPartyCaptureRows: false,
    eligibleUse: 'announcement-level provenance only',
  },
  {
    sourceId: 'official-x-account',
    label: 'Official X account',
    sourceKind: 'official-social-account',
    url: 'https://x.com/Survivor_io',
    observedContent:
      'Public direct fetch/search did not expose a reliable structured corpus of original item/effect descriptions.',
    containsStructuredItemEffectDescriptions: false,
    canPopulateDirectFirstPartyCaptureRows: false,
    eligibleUse: 'announcement provenance only if direct original posts are captured',
  },
];

const SOURCE_ROUTES = [
  {
    routeId: 'official-public-web',
    label: 'Official public web/social announcements',
    qualifiesForDirectFirstPartyDescriptionRowsNow: false,
    currentRowsAvailable: 0,
    policy:
      'Use as release or existence provenance only unless the official page itself exposes exact row-level original description text.',
  },
  {
    routeId: 'direct-game-ui-capture',
    label: 'Direct in-game UI screenshot/video capture',
    qualifiesForDirectFirstPartyDescriptionRowsNow: true,
    currentRowsAvailable: EXPECTED_CAPTURE_ROWS,
    policy:
      'Preferred route for one-by-one validation: preserve raw screenshot/video plus exact original description text and map it to an atomRowId.',
  },
  {
    routeId: 'lawful-app-resource-extraction',
    label: 'Lawful app resource/localization inspection',
    qualifiesForDirectFirstPartyDescriptionRowsNow: false,
    currentRowsAvailable: 0,
    policy:
      'Potentially valid only for lawfully obtained first-party static text resources; do not bypass encryption, DRM, auth, or protections.',
  },
  {
    routeId: 'third-party-guides-community',
    label: 'Third-party guides, wiki, Reddit, public mirrors',
    qualifiesForDirectFirstPartyDescriptionRowsNow: false,
    currentRowsAvailable: 0,
    policy:
      'Corroboration and triage only; never promote to direct first-party description capture.',
  },
];

const LOCAL_RESOURCE_EXTENSIONS = new Set([
  '.apk',
  '.apks',
  '.aab',
  '.ipa',
  '.strings',
  '.stringsdict',
  '.arb',
]);

const LOCAL_RESOURCE_BASENAMES = new Set([
  'strings.xml',
  'Localizable.strings',
]);

async function readJson(relativePath) {
  return JSON.parse(await fs.readFile(path.join(root, relativePath.replace(/^frontend\//, '')), 'utf8'));
}

async function readText(relativePath) {
  return fs.readFile(path.join(root, relativePath.replace(/^frontend\//, '')), 'utf8');
}

function stableObject(value) {
  if (Array.isArray(value)) {
    return value.map(stableObject);
  }
  if (value && typeof value === 'object') {
    return Object.fromEntries(
      Object.entries(value)
        .sort(([left], [right]) => left.localeCompare(right))
        .map(([key, item]) => [key, stableObject(item)]),
    );
  }
  return value;
}

function cell(value) {
  return String(value ?? '')
    .replace(/\|/g, '\\|')
    .replace(/\n/g, '<br>');
}

async function assertTrackedOrStaged(relativePath) {
  try {
    await execFileAsync('git', ['ls-files', '--error-unmatch', relativePath], { cwd: repoRoot });
    return;
  } catch {
    const { stdout } = await execFileAsync('git', ['diff', '--cached', '--name-only', '--', relativePath], {
      cwd: repoRoot,
    });
    assert.ok(
      stdout.split('\n').includes(relativePath),
      `${relativePath} must be tracked or staged with git add -f because frontend/artifacts is ignored`,
    );
  }
}

async function scanLocalResourceCandidates() {
  const roots = ['frontend', 'docs'].map((item) => path.join(root, '..', item));
  const results = [];
  async function walk(currentPath) {
    let entries;
    try {
      entries = await fs.readdir(currentPath, { withFileTypes: true });
    } catch (error) {
      if (error.code === 'ENOENT') return;
      throw error;
    }
    for (const entry of entries) {
      if (entry.name === 'node_modules' || entry.name === '.git' || entry.name === '.next') continue;
      const absolutePath = path.join(currentPath, entry.name);
      if (entry.isDirectory()) {
        await walk(absolutePath);
        continue;
      }
      const extension = path.extname(entry.name);
      if (LOCAL_RESOURCE_EXTENSIONS.has(extension) || LOCAL_RESOURCE_BASENAMES.has(entry.name)) {
        results.push(path.relative(path.join(root, '..'), absolutePath));
      }
    }
  }
  await Promise.all(roots.map(walk));
  return results.sort();
}

const [
  descriptionFormulaValidation,
  descriptionFormulaValidationProtocol,
  captureInbox,
  captureImport,
  captureImportProtocol,
  formulaSpec,
  inGameDescriptionEvidence,
  localResourceCandidatePaths,
] = await Promise.all([
  readJson('frontend/artifacts/td11/tangtang_description_formula_validation_matrix.json'),
  readText('frontend/artifacts/td11/tangtang_description_formula_validation_protocol.md'),
  readJson('frontend/artifacts/td11/tangtang_description_capture_inbox.json'),
  readJson('frontend/artifacts/td11/tangtang_description_capture_import_matrix.json'),
  readText('frontend/artifacts/td11/tangtang_description_capture_import_protocol.md'),
  readJson('frontend/artifacts/td11/tangtang_damage_formula_spec.json'),
  readJson('frontend/artifacts/td11/in_game_description_evidence_matrix.json'),
  scanLocalResourceCandidates(),
]);

for (const input of SOURCE_INPUTS) {
  await fs.access(path.join(root, input.replace(/^frontend\//, '')));
}

await Promise.all([
  assertTrackedOrStaged('frontend/artifacts/td11/tangtang_first_party_description_source_inventory.json'),
  assertTrackedOrStaged('frontend/artifacts/td11/tangtang_first_party_description_source_inventory.md'),
]);

function buildInventory() {
  const officialPublicStructuredRows = OFFICIAL_PUBLIC_SOURCE_CANDIDATES.filter(
    (source) => source.containsStructuredItemEffectDescriptions,
  );
  const officialPublicDirectRows = OFFICIAL_PUBLIC_SOURCE_CANDIDATES.filter(
    (source) => source.canPopulateDirectFirstPartyCaptureRows,
  );
  return stableObject({
    title: 'Tangtang First-Party Description Source Inventory',
    generatedAtKst: formulaSpec.generatedAtKst,
    status: '[TANGTANG-FIRST-PARTY-DESCRIPTION-SOURCE-INVENTORY-READY]',
    claim: 'first-party-description-source-inventory',
    behaviorChange: false,
    sourceInputs: SOURCE_INPUTS,
    officialPublicSourceCandidates: OFFICIAL_PUBLIC_SOURCE_CANDIDATES,
    sourceRoutes: SOURCE_ROUTES,
    localAppResourceScan: {
      scannedRoots: ['frontend', 'docs'],
      candidateExtensions: [...LOCAL_RESOURCE_EXTENSIONS].sort(),
      candidateBasenames: [...LOCAL_RESOURCE_BASENAMES].sort(),
      candidatePaths: localResourceCandidatePaths,
      policy:
        'Static app-resource text can count only when lawfully obtained first-party text is preserved with version and resource path.',
    },
    captureTemplate: {
      requiredFields: FIRST_PARTY_REQUIRED_FIELDS,
      recommendedFields: RECOMMENDED_CAPTURE_FIELDS,
      exampleRow: {
        captureId: 'td11-capture-YYYYMMDD-001',
        atomRowId: 'collectible-item:aerocoreOrb:stars:8:critRate',
        captureDateKst: '2026-05-23',
        gameVersion: 'manual-from-title-screen-or-unknown',
        sourceKind: 'direct-first-party-in-game',
        captureEvidenceTier: 'direct-first-party-description',
        language: 'ko-KR',
        entityDisplayNameCaptured: 'Aerocore Orb',
        screenContext: 'collectible detail / star threshold / effect list',
        devicePlatform: 'ios|android|emulator|unknown',
        rawCaptureArtifactPaths: ['frontend/artifacts/td11/captures/td11-capture-YYYYMMDD-001.png'],
        ocrTextRaw: 'optional raw OCR output',
        descriptionTextOriginal: 'exact original in-game text',
        descriptionTextManualTranscription: 'manual transcription if OCR is unreliable',
        descriptionTextEnglishTranslation: 'optional; never replace original text',
        transcriptionConfidence: 'high|medium|low',
        transcriptionNotes: 'optional ambiguity notes',
        parsedFormulaOperation: 'threshold_add_percent',
        parsedFormulaValue: 5,
        operationBucket: 'crit-expectation',
        conditionOrThreshold: 'stars >= 8',
        rustStatChannel: 'critRate',
        multiplierStage: 'derived_base_stats before 31-stage damage vector',
      },
      atomRowIdPolicy: 'explicit formulaAtomRows[].rowId only; no fuzzy name matching',
      rawArtifactPolicy: 'OCR/manual transcription is assistive only; raw screenshot/video/resource artifact must be retained.',
    },
    validationPolicy: {
      publicWebPromotionAllowed: false,
      officialAnnouncementPromotionAllowed: false,
      automaticFormulaOrScoringChangeAllowed: false,
      observedDamageFollowUpAllowedOnlyFor: 'description-sio-divergent-needs-confirmation',
      acceptedSourceKind: 'direct-first-party-in-game',
      acceptedCaptureEvidenceTier: 'direct-first-party-description',
      rejectedEvidenceKinds: [
        'public-web',
        'sio-source-derived',
        'manual-inference',
        'ocr-only-without-raw-artifact',
        'translated-only-without-original',
        'third-party-corroboration-only',
      ],
    },
    summary: {
      officialPublicSourceCandidates: OFFICIAL_PUBLIC_SOURCE_CANDIDATES.length,
      officialPublicSourcesWithStructuredFormulaRows: officialPublicStructuredRows.length,
      officialPublicRowsPromotedToDirectCapture: officialPublicDirectRows.length,
      localAppResourceArtifactsFound: localResourceCandidatePaths.length,
      formulaAtomRows: descriptionFormulaValidation.formulaAtomSummary.totalRows,
      rowsRequiringDirectDescriptionCapture:
        descriptionFormulaValidation.formulaAtomSummary.rowsRequiringDirectDescriptionCapture,
      directFirstPartyDescriptionFormulaRows:
        descriptionFormulaValidation.validationScope.directFirstPartyDescriptionFormulaRows,
      publicWebCorroboratedNotFirstPartyRows:
        descriptionFormulaValidation.formulaAtomSummary.rowsByEvidenceTier['public-web-corroborated'] ?? 0,
      captureInboxRows: captureImport.summary.captureInboxRows,
      directFirstPartyDescriptionCaptureRows:
        captureImport.summary.directFirstPartyDescriptionCaptureRows ?? captureImport.summary.acceptedCaptureRows,
      parsedDescriptionFormulaRows: captureImport.summary.parsedDescriptionFormulaRows,
      matchedSioRows: captureImport.summary.matchedSioRows,
      descriptionSioDivergenceRows: captureImport.summary.descriptionSioDivergenceRows,
      observedDamageFollowUpRows: captureImport.summary.observedDamageFollowUpRows,
      formulaAtomRowsRemainingWithoutDirectCapture:
        captureImport.firstPartyCaptureCoverage.formulaAtomRowsRemainingWithoutDirectCapture,
      canApplyTangtangFormulaCorrectionNow: captureImport.decisionPolicy.canApplyTangtangFormulaCorrection,
      userOneByOneCaptureRequired: true,
      publicOfficialWebSufficientForFormulaValidation: false,
    },
    artifactPaths: {
      json: 'frontend/artifacts/td11/tangtang_first_party_description_source_inventory.json',
      markdown: 'frontend/artifacts/td11/tangtang_first_party_description_source_inventory.md',
      script: 'frontend/scripts/tangtang_first_party_description_source_inventory_unit_test.mjs',
      captureInbox: 'frontend/artifacts/td11/tangtang_description_capture_inbox.json',
      captureImportMatrix: 'frontend/artifacts/td11/tangtang_description_capture_import_matrix.json',
      formulaAtomLedger: 'frontend/artifacts/td11/tangtang_description_formula_validation_matrix.json',
    },
    verificationCommands: [
      'node scripts/tangtang_first_party_description_source_inventory_unit_test.mjs',
      'node scripts/tangtang_description_capture_import_unit_test.mjs',
      'node scripts/tangtang_description_formula_validation_unit_test.mjs',
      'node scripts/damage_formula_provenance_matrix_unit_test.mjs',
      'SIO_FULL_EQUIVALENCE_REQUIRED=1 node scripts/sio_full_equivalence_gate.mjs',
      'git diff --check',
    ],
  });
}

function renderSourceTable(sources) {
  return [
    '| Source | Kind | Structured formula rows? | Direct capture rows now? | Eligible use | URL |',
    '|---|---|---:|---:|---|---|',
    ...sources.map((source) => [
      source.label,
      source.sourceKind,
      source.containsStructuredItemEffectDescriptions,
      source.canPopulateDirectFirstPartyCaptureRows,
      source.eligibleUse,
      source.url,
    ].map(cell).join(' | ')).map((line) => `| ${line} |`),
  ].join('\n');
}

function renderRouteTable(routes) {
  return [
    '| Route | Qualifies now? | Current rows | Policy |',
    '|---|---:|---:|---|',
    ...routes.map((route) => [
      route.label,
      route.qualifiesForDirectFirstPartyDescriptionRowsNow,
      route.currentRowsAvailable,
      route.policy,
    ].map(cell).join(' | ')).map((line) => `| ${line} |`),
  ].join('\n');
}

function renderMarkdown(inventory) {
  return `# ${inventory.title}

generatedAtKst: ${inventory.generatedAtKst}
status: ${inventory.status}
claim: \`${inventory.claim}\`
behaviorChange: \`${inventory.behaviorChange}\`

## Executive Summary

The current official/public web search did not find a first-party public source with complete structured item/effect in-game description rows for the Tangtang formula atom ledger.

Official pages and announcements can support release or existence provenance, but they do not populate direct first-party description capture rows. Direct formula validation still needs in-game UI captures or lawful first-party app-resource text that preserves the original description.

No formula semantics, scoring core, Rust damage formulas, WASM scoring behavior, optimizer ranking, or product UI changed.

## Summary

- Official/public source candidates checked: ${inventory.summary.officialPublicSourceCandidates}
- Official/public sources with structured formula rows: ${inventory.summary.officialPublicSourcesWithStructuredFormulaRows}
- Official/public rows promoted to direct capture: ${inventory.summary.officialPublicRowsPromotedToDirectCapture}
- Local app resource artifacts found: ${inventory.summary.localAppResourceArtifactsFound}
- Formula atom rows requiring direct description capture: ${inventory.summary.rowsRequiringDirectDescriptionCapture}
- Direct first-party description-derived formula rows in formula-validation gate before capture import: ${inventory.summary.directFirstPartyDescriptionFormulaRows}
- Capture inbox rows: ${inventory.summary.captureInboxRows}
- Direct first-party description capture rows: ${inventory.summary.directFirstPartyDescriptionCaptureRows}
- Parsed description formula rows: ${inventory.summary.parsedDescriptionFormulaRows}
- Matched SIO rows: ${inventory.summary.matchedSioRows}
- Description/SIO divergence rows: ${inventory.summary.descriptionSioDivergenceRows}
- Observed damage follow-up rows: ${inventory.summary.observedDamageFollowUpRows}
- Formula atom rows remaining without direct capture: ${inventory.summary.formulaAtomRowsRemainingWithoutDirectCapture}
- Can apply Tangtang formula correction now: \`${inventory.summary.canApplyTangtangFormulaCorrectionNow}\`
- Public official web sufficient for formula validation: \`${inventory.summary.publicOfficialWebSufficientForFormulaValidation}\`

## Official/Public Source Inventory

${renderSourceTable(inventory.officialPublicSourceCandidates)}

## Source Routes

${renderRouteTable(inventory.sourceRoutes)}

## Local App Resource Scan

- Scanned roots: ${inventory.localAppResourceScan.scannedRoots.map((item) => `\`${item}\``).join(', ')}
- Candidate app/resource artifacts found: ${inventory.localAppResourceScan.candidatePaths.length}
- Candidate paths:
${inventory.localAppResourceScan.candidatePaths.length === 0 ? '  - none' : inventory.localAppResourceScan.candidatePaths.map((item) => `  - \`${item}\``).join('\n')}

Policy: ${inventory.localAppResourceScan.policy}

## Capture Template

Required fields:

${inventory.captureTemplate.requiredFields.map((field) => `- \`${field}\``).join('\n')}

Recommended extra fields:

${inventory.captureTemplate.recommendedFields
    .filter((field) => !inventory.captureTemplate.requiredFields.includes(field))
    .map((field) => `- \`${field}\``)
    .join('\n')}

Atom mapping: ${inventory.captureTemplate.atomRowIdPolicy}

Raw artifact policy: ${inventory.captureTemplate.rawArtifactPolicy}

## Validation Policy

- Public web promotion allowed: \`${inventory.validationPolicy.publicWebPromotionAllowed}\`
- Official announcement promotion allowed: \`${inventory.validationPolicy.officialAnnouncementPromotionAllowed}\`
- Automatic formula/scoring change allowed: \`${inventory.validationPolicy.automaticFormulaOrScoringChangeAllowed}\`
- Accepted source kind: \`${inventory.validationPolicy.acceptedSourceKind}\`
- Accepted capture evidence tier: \`${inventory.validationPolicy.acceptedCaptureEvidenceTier}\`
- Observed damage follow-up allowed only for: \`${inventory.validationPolicy.observedDamageFollowUpAllowedOnlyFor}\`

Rejected evidence kinds:

${inventory.validationPolicy.rejectedEvidenceKinds.map((kind) => `- \`${kind}\``).join('\n')}

## Evidence Artifacts

${inventory.sourceInputs.map((input) => `- \`${input}\``).join('\n')}

## Verification Commands

${inventory.verificationCommands.map((command) => `- \`${command}\``).join('\n')}
`;
}

const inventory = buildInventory();
const markdown = renderMarkdown(inventory);
const serializedJson = `${JSON.stringify(inventory, null, 2)}\n`;

assert.equal(inventory.title, 'Tangtang First-Party Description Source Inventory');
assert.equal(inventory.status, '[TANGTANG-FIRST-PARTY-DESCRIPTION-SOURCE-INVENTORY-READY]');
assert.equal(inventory.claim, 'first-party-description-source-inventory');
assert.equal(inventory.behaviorChange, false);
assert.equal(inventory.summary.officialPublicSourceCandidates, 8);
assert.equal(inventory.summary.officialPublicSourcesWithStructuredFormulaRows, 0);
assert.equal(inventory.summary.officialPublicRowsPromotedToDirectCapture, 0);
assert.equal(inventory.summary.localAppResourceArtifactsFound, 0);
assert.equal(inventory.summary.formulaAtomRows, 221);
assert.equal(inventory.summary.rowsRequiringDirectDescriptionCapture, 221);
assert.equal(inventory.summary.directFirstPartyDescriptionFormulaRows, 0);
assert.equal(inventory.summary.publicWebCorroboratedNotFirstPartyRows, 7);
assert.equal(inventory.summary.captureInboxRows, EXPECTED_CAPTURE_ROWS);
assert.equal(inventory.summary.directFirstPartyDescriptionCaptureRows, EXPECTED_CAPTURE_ROWS);
assert.equal(inventory.summary.parsedDescriptionFormulaRows, EXPECTED_CAPTURE_ROWS);
assert.equal(inventory.summary.matchedSioRows, EXPECTED_CAPTURE_ROWS);
assert.equal(inventory.summary.descriptionSioDivergenceRows, 0);
assert.equal(inventory.summary.observedDamageFollowUpRows, 0);
assert.equal(inventory.summary.formulaAtomRowsRemainingWithoutDirectCapture, 212);
assert.equal(inventory.summary.canApplyTangtangFormulaCorrectionNow, false);
assert.equal(inventory.summary.publicOfficialWebSufficientForFormulaValidation, false);
assert.deepEqual(captureInbox.requiredFields, FIRST_PARTY_REQUIRED_FIELDS);
assert.deepEqual(captureImport.captureInput.requiredFields, FIRST_PARTY_REQUIRED_FIELDS);
assert.ok(captureImportProtocol.includes('captureEvidenceTier'));
assert.ok(descriptionFormulaValidationProtocol.includes('Formula atom rows: 221'));
assert.equal(formulaSpec.behaviorChange, false);
assert.equal(inGameDescriptionEvidence.summary.mountRowsWithExactInGameDescriptions, 0);
assert.equal(
  inventory.sourceRoutes.find((route) => route.routeId === 'direct-game-ui-capture')
    .qualifiesForDirectFirstPartyDescriptionRowsNow,
  true,
);
assert.equal(
  inventory.sourceRoutes.find((route) => route.routeId === 'direct-game-ui-capture').currentRowsAvailable,
  EXPECTED_CAPTURE_ROWS,
);
assert.equal(
  inventory.sourceRoutes.find((route) => route.routeId === 'third-party-guides-community')
    .qualifiesForDirectFirstPartyDescriptionRowsNow,
  false,
);
assert.ok(markdown.includes('Official/public sources with structured formula rows: 0'));
assert.ok(markdown.includes('Public official web sufficient for formula validation: `false`'));

if (writeMode) {
  await fs.mkdir(path.dirname(jsonPath), { recursive: true });
  await fs.writeFile(jsonPath, serializedJson);
  await fs.writeFile(mdPath, markdown);
  console.log(`tangtang_first_party_description_source_inventory_unit_test: wrote ${jsonPath} and ${mdPath}`);
} else {
  const [existingJson, existingMarkdown] = await Promise.all([
    fs.readFile(jsonPath, 'utf8'),
    fs.readFile(mdPath, 'utf8'),
  ]);
  assert.equal(existingJson, serializedJson, 'Tangtang first-party source inventory JSON is stale; run with --write');
  assert.equal(existingMarkdown, markdown, 'Tangtang first-party source inventory MD is stale; run with --write');
  console.log(
    `tangtang_first_party_description_source_inventory_unit_test: passed (${inventory.summary.officialPublicSourceCandidates} source candidates)`,
  );
}

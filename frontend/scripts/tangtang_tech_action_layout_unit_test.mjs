import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const root = process.cwd();
const optimizer = readFileSync(resolve(root, 'components/v3/optimizer.tsx'), 'utf8');
const impactTable = readFileSync(resolve(root, 'components/v3/tech/TechBeforeAfterImpactTable.tsx'), 'utf8');
const copy = readFileSync(resolve(root, 'components/v3/tech/techLocaleCopy.ts'), 'utf8');

const profileSaveIndex = optimizer.indexOf('<ProfileSavePanel');
const actionStripIndex = optimizer.indexOf('data-testid="tech-action-strip"');
const accountContextIndex = optimizer.indexOf('<AccountContextPanel');
const resultsIndex = optimizer.indexOf('data-testid="tech-optimizer-results"');

assert.ok(profileSaveIndex > -1, 'profile save panel must be present');
assert.ok(actionStripIndex > -1, 'horizontal action strip must be present');
assert.ok(accountContextIndex > -1, 'account context panel must be present');
assert.ok(resultsIndex > -1, 'results panel must be present');
assert.ok(profileSaveIndex < actionStripIndex, 'action strip must sit directly after saved profiles');
assert.ok(actionStripIndex < accountContextIndex, 'action strip must sit above account/game inputs');
assert.ok(accountContextIndex < resultsIndex, 'results panel must stay below input panels');

const actionStripBody = optimizer.slice(actionStripIndex, accountContextIndex);
assert.match(actionStripBody, /data-testid="tech-search-card"/, 'action strip must include the search card');
assert.match(actionStripBody, /<TechBeforeAfterImpactTable/, 'action strip must include before/after impact');
assert.match(actionStripBody, /data-testid="tech-optimizer-run"/, 'search card must keep the run action visible');
assert.match(actionStripBody, /<TechBeforeAfterImpactTable\s+rows=\{upgradeImpactRows\}/, 'impact panel must render from live impact rows without being buried in results');

const resultsBody = optimizer.slice(resultsIndex);
assert.doesNotMatch(
  resultsBody,
  /<TechBeforeAfterImpactTable/,
  'before/after impact must not be nested inside the ranked results panel',
);

assert.match(impactTable, /copy\.impact\.empty/, 'impact panel must have an empty state before comparison rows exist');
assert.match(copy, /empty: 'Run an imported profile/, 'English impact copy must explain the empty state');
assert.match(copy, /empty: '가져온 프로필을 계산하면/, 'Korean impact copy must explain the empty state');

console.log('tangtang_tech_action_layout_unit_test: passed');

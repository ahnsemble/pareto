import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const root = process.cwd();
const componentPath = resolve(root, 'components/LanguageToggle.tsx');
const layoutPath = resolve(root, 'app/[locale]/layout.tsx');
const routingPath = resolve(root, 'i18n/routing.ts');

assert.ok(existsSync(componentPath), 'global LanguageToggle component must exist');

const component = readFileSync(componentPath, 'utf8');
const layout = readFileSync(layoutPath, 'utf8');
const routing = readFileSync(routingPath, 'utf8');

assert.match(routing, /locales:\s*\[\s*['"]en['"],\s*['"]ko['"]\s*\]/, 'routing must keep English and Korean locales');
assert.match(layout, /import\s+\{\s*LanguageToggle\s*\}\s+from\s+['"]\.\.\/\.\.\/components\/LanguageToggle['"]/, 'locale layout must import the global language toggle');
assert.match(layout, /<LanguageToggle\s*\/>/, 'locale layout must render the language toggle above localized content');
assert.ok(layout.indexOf('<LanguageToggle />') < layout.indexOf('{children}'), 'language toggle must appear before page content');

assert.match(component, /'use client'/, 'language toggle must be a client component so it can preserve the current path and query');
assert.match(component, /useLocale/, 'language toggle must read the current locale');
assert.match(component, /usePathname/, 'language toggle must preserve the current route path');
assert.match(component, /useSearchParams/, 'language toggle must preserve query parameters such as share/import links');
assert.match(component, /replace\(\s*\/\^\\\/\(en\|ko\)\(\?=\\\/\|\$\)\//, 'language toggle must strip the current locale prefix before rebuilding the target href');
assert.match(component, /data-testid="language-toggle"/, 'language toggle must expose a stable test id');
assert.match(component, /data-testid=\{`language-toggle-\$\{link\.locale\}`\}/, 'locale targets must expose stable test ids');
assert.match(component, /'EN'/, 'English label must be compact and visible');
assert.match(component, /'한'/, 'Korean label must be compact and visible');
assert.doesNotMatch(component, /\bSIO\b|sio-tools|debug|preselect|beam|exact node/i, 'language toggle must not expose internal source/debug wording');

console.log('tangtang_language_toggle_unit_test: passed');

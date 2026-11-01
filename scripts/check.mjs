// Static checks that run in CI before anything deploys:
//  1. every script in site/js parses
//  2. every local file the HTML points at exists
//  3. pages load nothing from other origins (fonts are self-hosted)
//  4. every project preview image exists
//  5. the security headers are still in place
import { readFileSync, readdirSync, existsSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

const SITE = fileURLToPath(new URL('../site/', import.meta.url));
let problems = 0;
const fail = (msg) => { problems++; console.error(`✗ ${msg}`); };
const pass = (msg) => console.log(`✓ ${msg}`);

const scripts = readdirSync(join(SITE, 'js')).filter((f) => f.endsWith('.js'));
let bad = 0;
for (const f of scripts) {
  try {
    execFileSync(process.execPath, ['--check', join(SITE, 'js', f)], { stdio: 'pipe' });
  } catch (e) {
    bad++;
    fail(`js/${f} does not parse\n${e.stderr}`);
  }
}
if (!bad) pass(`${scripts.length} scripts parse`);

for (const page of ['index.html', '404.html']) {
  const html = readFileSync(join(SITE, page), 'utf8');
  let missing = 0;
  for (const [, ref] of html.matchAll(/\b(?:src|href)="([^"#]+)"/g)) {
    if (/^(https?:)?\/\//.test(ref) || /^(mailto|tel):/.test(ref)) continue;
    const local = ref.split('?')[0].replace(/^\//, '') || 'index.html';
    if (!existsSync(join(SITE, local))) { missing++; fail(`${page} points at ${ref}, which does not exist`); }
  }
  if (!missing) pass(`${page}: every local file it references exists`);

  const external = [...html.matchAll(/<(?:script|link)\b[^>]*\b(?:src|href)="(?:https?:)?\/\/[^"]*"[^>]*>/g)]
    .map((m) => m[0])
    .filter((tag) => !/rel="canonical"/.test(tag));
  external.forEach((tag) => fail(`${page} loads from another origin: ${tag}`));
  if (!external.length) pass(`${page}: loads nothing from other origins`);
}

const data = readFileSync(join(SITE, 'js/core.js'), 'utf8');
let missingImages = 0;
for (const [, ref] of data.matchAll(/'(\/img\/[^']+)'/g)) {
  if (!existsSync(join(SITE, ref.slice(1)))) { missingImages++; fail(`core.js points at ${ref}, which does not exist`); }
}
if (!missingImages) pass('every project preview image exists');

const headers = readFileSync(join(SITE, '_headers'), 'utf8');
for (const h of ['Content-Security-Policy', 'X-Content-Type-Options', 'Referrer-Policy']) {
  if (headers.includes(`${h}:`)) pass(`_headers sets ${h}`);
  else fail(`_headers no longer sets ${h}`);
}

if (problems) {
  console.error(`\n${problems} problem(s) found`);
  process.exit(1);
}
console.log('\nAll static checks passed');

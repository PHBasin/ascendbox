// Browser-driven visual check for AscendBox - see SKILL.md.
// Run from the repo root so Node resolves `playwright-core` from ./node_modules:
//   node .claude/skills/visual-check/screenshot.mjs [outDir] [--full] [--only=a,b] [--url=…]
//
// VIEWPORTS below is the single source of truth for what gets checked: each entry
// carries its own `note` explaining why that width matters, and the notes are
// printed. Add a row here rather than describing a new case in SKILL.md.
import { chromium } from 'playwright-core';
import { readdirSync, existsSync, mkdirSync } from 'node:fs';
import { join } from 'node:path';
import { homedir } from 'node:os';

// playwright-core does NOT download browsers. Prefer the pinned Chromium that
// `playwright install` fetched (reproducible across runs - a system Chrome
// auto-updates under you), and fall back to a system Chrome so the skill still
// runs on a machine that never had the one-time setup.
function findChromium() {
  const root = join(homedir(), '.cache', 'ms-playwright');
  if (existsSync(root)) {
    // The version dir (e.g. chromium_headless_shell-1228) changes across
    // Playwright releases, so discover it instead of hard-coding.
    for (const dir of readdirSync(root)) {
      if (!dir.startsWith('chromium')) continue;
      for (const rel of [
        'chrome-headless-shell-linux64/chrome-headless-shell',
        'chrome-linux/chrome',
      ]) {
        const p = join(root, dir, rel);
        if (existsSync(p)) return p;
      }
    }
  }
  for (const p of ['/usr/bin/google-chrome', '/usr/bin/chromium', '/usr/bin/chromium-browser']) {
    if (existsSync(p)) return p;
  }
  throw new Error('No browser found - run: npx --yes playwright@latest install chromium');
}

const args = process.argv.slice(2);
const flag = (name) => args.find((a) => a.startsWith(`--${name}=`))?.split('=')[1];
const OUT = args.find((a) => !a.startsWith('--')) ?? '/tmp/ascendbox-shots';
const URL = flag('url') ?? process.env.APP_URL ?? 'http://localhost:3000';
const FULL_PAGE = args.includes('--full'); // default: just the sticky header
const ONLY = flag('only')?.split(',');

async function openSearch(page) {
  await page.getByRole('button', { name: 'Rechercher un exercice' }).click();
  await page.waitForTimeout(300);
}

const VIEWPORTS = [
  { name: 'mobile-390', w: 390, h: 844,
    note: 'the stated target: 3 scope axes on one line, labels complete' },
  { name: 'mobile-360', w: 360, h: 844,
    note: 'common Android: must wrap gracefully, never clip or scroll' },
  { name: 'mobile-search', w: 390, h: 844, action: openSearch,
    note: 'search open: `Exercices` hidden, field takes the row' },
  { name: 'tablet-783-search', w: 783, h: 806, action: openSearch,
    note: 'the tightest width that still holds title + field + Filtres' },
  { name: 'desktop-1024-search', w: 1024, h: 800, action: openSearch,
    note: 'search open with room to spare' },
  { name: 'desktop-1280', w: 1280, h: 800,
    note: 'scope centered between title and search+Filtres' },
  { name: 'desktop-search', w: 1280, h: 800, action: openSearch,
    note: 'search open at full width' },
];

mkdirSync(OUT, { recursive: true });
const browser = await chromium.launch({ executablePath: findChromium() });
const failures = [];

for (const { name, w, h, action, note } of VIEWPORTS) {
  if (ONLY && !ONLY.includes(name)) continue;
  const ctx = await browser.newContext({ viewport: { width: w, height: h }, deviceScaleFactor: 2 });
  const page = await ctx.newPage();
  await page.goto(URL, { waitUntil: 'networkidle' });
  await page.waitForTimeout(400);
  if (action) await action(page);

  // The one invariant this script asserts: no horizontal scroll, at any width.
  // Everything else needs human eyes on the PNG.
  const overflow = await page.evaluate(
    () => document.documentElement.scrollWidth - document.documentElement.clientWidth
  );
  if (overflow !== 0) failures.push(`${name}: h-overflow=${overflow}px`);

  const target = FULL_PAGE ? page : page.locator('header').first();
  await target.screenshot({ path: join(OUT, `${name}.png`), fullPage: FULL_PAGE || undefined });

  console.log(`${overflow === 0 ? 'ok  ' : 'FAIL'} ${name.padEnd(20)} ${`${w}x${h}`.padEnd(9)} ${note}`);
  await ctx.close();
}

await browser.close();

console.log(`\n${FULL_PAGE ? 'Full-page' : 'Header'} screenshots in ${OUT}`);
if (failures.length) {
  console.error(`\nHorizontal overflow (must be 0px):\n  ${failures.join('\n  ')}`);
  process.exit(1);
}

// Browser-driven visual check for AscendBox — see SKILL.md.
// Run from the repo root so Node resolves `playwright-core` from ./node_modules:
//   node .claude/skills/visual-check/screenshot.mjs [outDir]
//
// Edit VIEWPORTS / the per-viewport actions below to target the surface you changed.
import { chromium } from 'playwright-core';
import { readdirSync, existsSync, mkdirSync } from 'node:fs';
import { join } from 'node:path';
import { homedir } from 'node:os';

// playwright-core does NOT download browsers; locate the one `playwright install`
// fetched. The version dir (e.g. chromium_headless_shell-1228) changes across
// Playwright releases, so discover it instead of hard-coding.
function findChromium() {
  const root = join(homedir(), '.cache', 'ms-playwright');
  if (!existsSync(root)) {
    throw new Error('No ms-playwright cache — run: npx --yes playwright@latest install chromium');
  }
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
  throw new Error(`No chromium binary under ${root} — run: npx --yes playwright@latest install chromium`);
}

const OUT = process.argv[2] || '/tmp/ascendbox-shots';
const URL = process.env.APP_URL || 'http://localhost:3000';
mkdirSync(OUT, { recursive: true });

const browser = await chromium.launch({ executablePath: findChromium() });

// (name, width, height, optional async action(page) run before the shot)
const VIEWPORTS = [
  ['mobile-390', 390, 844, null],
  ['mobile-360', 360, 844, null],
  ['mobile-search', 390, 844, openSearch],
  ['tablet-783-search', 783, 806, openSearch],
  ['desktop-1024-search', 1024, 800, openSearch],
  ['desktop-1280', 1280, 800, null],
  ['desktop-search', 1280, 800, openSearch],
];

async function openSearch(page) {
  await page.getByRole('button', { name: 'Rechercher un exercice' }).click();
  await page.waitForTimeout(300);
}

for (const [name, w, h, action] of VIEWPORTS) {
  const ctx = await browser.newContext({ viewport: { width: w, height: h }, deviceScaleFactor: 2 });
  const page = await ctx.newPage();
  await page.goto(URL, { waitUntil: 'networkidle' });
  await page.waitForTimeout(400);
  if (action) await action(page);

  // Horizontal overflow of the document = the "no horizontal scroll" invariant.
  const overflow = await page.evaluate(
    () => document.documentElement.scrollWidth - document.documentElement.clientWidth
  );
  // Focused shot of just the sticky header (change to full page if needed).
  await page.locator('header').first().screenshot({ path: join(OUT, `${name}.png`) });
  console.log(`${name}: ${w}x${h}  h-overflow=${overflow}px  -> ${name}.png`);
  await ctx.close();
}

await browser.close();
console.log(`\nDone. Screenshots in ${OUT} — open and LOOK at them (metrics alone hid a real bug once).`);

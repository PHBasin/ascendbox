---
name: visual-check
description: Launch AscendBox (Vite dev server) and drive it in a real headless Chromium via Playwright to visually verify UI/responsive changes — screenshots at mobile (390 px) and desktop widths, plus a horizontal-overflow check. Use whenever asked to run the app, screenshot it, or confirm a UI change works at a given viewport.
---

# Visual check — drive AscendBox in a real browser

AscendBox is a mobile-first Vue 3 + Vite PWA. Type-check and lint prove it
compiles; they do **not** prove the layout is right. This skill launches the
actual app and screenshots it at real viewports. It exists because a metrics-only
check once passed while `Technique` was silently truncated to `Techniq…` — so
**always open the PNGs and look**.

## 1. Dev server (port 3000)

Reuse it if it's already up; only start one if not:

```bash
curl -s -o /dev/null -w '%{http_code}\n' http://localhost:3000   # 200 = already running
```

If not 200, start it in the background and wait for it:

```bash
npm run dev            # Vite, port 3000 (vite.config.ts). Has HMR — edits apply live.
```

## 2. One-time browser setup

No browser or Playwright ships with the repo. Install the headless Chromium and
the driver library (kept out of `package.json` on purpose — the project has a
deliberately tiny dependency set):

```bash
npx --yes playwright@latest install chromium   # ~115 MB -> ~/.cache/ms-playwright (cached after first run)
npm install --no-save playwright-core          # driver lib into node_modules only
```

Both are idempotent and fast once cached. `screenshot.mjs` locates the Chromium
binary itself (the version dir changes across releases, so it is discovered, not
hard-coded).

## 3. Run the driver

Run it **from the repo root** so Node resolves `playwright-core` from
`./node_modules` (a bare `import` fails from `/tmp` — resolution walks up from the
script's directory):

```bash
node .claude/skills/visual-check/screenshot.mjs /tmp/ascendbox-shots
```

It prints one line per viewport with the `h-overflow` value (must be `0px` — that
is the "no horizontal scroll" invariant) and writes `<name>.png` files.

## 4. Look at the screenshots

Open each PNG with the Read tool and **actually inspect it** — a blank frame is a
launch failure, and truncated/clipped labels or overlapping controls won't show
up in the overflow number. The header checks in `screenshot.mjs` cover:

- **Mobile 390 px** (the stated target): the 3 category axes (`Physique` ·
  `Technique` · `Mental`) fully visible with complete labels, one line, no scroll.
- **Mobile 360 px**: graceful — wraps to a second line rather than scrolling/clipping.
- **Desktop 1280 px**: single line, scope centered between title and search+Filtres.
- **Search open** (both sizes): the `Exercices` title is hidden, the field takes the row.

## Adapting

Edit the `VIEWPORTS` array and per-viewport actions in
[screenshot.mjs](screenshot.mjs) to target whatever you changed (other widths,
other components, other interactions). Selectors use accessible roles/names
(`getByRole`), so keep `aria-label`s in sync. To shoot the whole page instead of
just the header, replace `page.locator('header').first().screenshot(...)` with
`page.screenshot({ fullPage: true, ... })`.

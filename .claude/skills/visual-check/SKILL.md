---
name: visual-check
description: Launch AscendBox (Vite dev server) and screenshot it in a real headless Chromium via Playwright, at mobile through desktop viewports, asserting no horizontal scroll. Use whenever asked to run the app, screenshot it, or confirm a UI change works at a given viewport.
---

# Visual check — drive AscendBox in a real browser

`type-check` and `lint` prove the app compiles; they do not prove the layout is
right. This skill runs the real app at real widths and captures what it looks
like.

It exists because a metrics-only check once passed green while `Technique` was
silently rendering as `Techniq…`. The script therefore asserts exactly one thing
— no horizontal scroll — and leaves everything else to your eyes.

## Run it

```bash
curl -s -o /dev/null -w '%{http_code}\n' http://localhost:3000   # 200 = reuse it
npm run dev                                                      # only if not 200; background it
node .claude/skills/visual-check/screenshot.mjs /tmp/ascendbox-shots
```

Run the script **from the repo root** — a bare `import` of `playwright-core`
resolves by walking up from the script's directory, so it fails from `/tmp`.

Options: `--full` shoots the whole page instead of the sticky header,
`--only=mobile-390,desktop-1280` limits the run, `--url=…` points elsewhere.

## Read the result

The script prints one line per viewport — `ok`/`FAIL`, the size, and why that
width is checked — then **exits non-zero if any viewport scrolls horizontally**.
A green run is necessary, not sufficient.

So open every PNG with the Read tool and look at it. A blank frame means the
launch failed; clipped labels, overlapping controls and wrong spacing are all
invisible to the overflow number. That is the whole point of the skill.

## One-time browser setup

Neither Playwright nor a browser is in `package.json` — the project keeps a
deliberately tiny dependency set.

```bash
npx --yes playwright@latest install chromium   # ~115 MB -> ~/.cache/ms-playwright
npm install --no-save playwright-core          # driver lib, node_modules only
```

Both are idempotent and fast once cached. The script discovers the Chromium
binary itself, and falls back to a system Chrome if that cache is absent — but
prefer the pinned build, since a system Chrome auto-updates and makes screenshots
incomparable between runs.

## Adapting

`VIEWPORTS` in [screenshot.mjs](screenshot.mjs) is the source of truth for what
gets checked; each row carries the `note` that gets printed. Add a row there
rather than documenting a new case here. Selectors use accessible roles and names
(`getByRole`), so keep `aria-label`s in sync with them.

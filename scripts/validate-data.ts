// scripts/validate-data.ts
// Contract check for the hand-authored catalogue — run in CI, never shipped to the browser.
//
// `public/data/exercises.json` is *fetched* at runtime, never imported, so `vue-tsc` cannot see it:
// a field renamed in `Exercise`, a typo'd `categoryId` or a `level: 4` type-checks clean and only
// fails in the coach's browser — outdoors, on a cliff, offline. This script closes that gap.
//
// Validating at build time rather than at boot is deliberate: the data is kept out of the JS bundle
// for TTI, and shipping a schema library to re-check 100 known-good exercises on every cold start
// would spend that budget twice over.
//
// The coupling that matters is `FIELDS`: it is a mapped type over `keyof Required<Exercise>`, so
// adding a field to the interface fails `type-check` until a rule for it is written here. The
// validator cannot silently fall behind the entity it validates — which is the whole point, since
// a hand-authored file drifting from its interface is the failure mode this exists to prevent.
//
// Messages are in English like the rest of the tooling; French is for catalogue content only.

import { readFileSync } from 'node:fs';
import process from 'node:process';
import { fileURLToPath } from 'node:url';

import { CATEGORIES } from '../src/domain/exercise.ts';
import type { Exercise, Protocol } from '../src/domain/exercise.ts';

// --- Editorial budgets (DESIGN §5.1, mirrored from the `teaser` doc comment) ---
// Past the ceiling `line-clamp-3` truncates mid-word, so the coach reads a cut sentence: an error.
// Past the target the card stops being title-led — a real regression, but an editorial one, and 91
// of the current 100 teasers sit there while the teaser/instructions split is still pending. It
// would be a gate nobody can pass today, so it warns. DESIGN §5.1 is explicit that the target must
// never become a hard limit.
// Both numbers are the 390px budget (DESIGN §5.1): the box is `viewport - 105px`, and French prose
// at 15px Inter runs ~7.1px/char, so a line holds ~38 chars. They are meaningless without that
// width — 360px would need ~90, which is deferred to the teaser/instructions split. And a char count
// only approximates the 3-line clamp, since wrapping breaks on words: it catches the runaway entry,
// it does not prove the clamp holds.
const TEASER_CEILING = 100;
const TEASER_TARGET = 70;

const DATA_PATH = fileURLToPath(new URL('../public/data/exercises.json', import.meta.url));

/** `null` = valid. Otherwise a message completing "<field> …", e.g. "must be an integer > 0". */
type Check = (value: unknown) => string | null;

type FieldSpec<K extends keyof Exercise> = {
  // The conditional type reads required-ness off `Exercise` itself, so a flag that contradicts the
  // interface is a compile error rather than a hole in the gate.
  required: undefined extends Exercise[K] ? false : true;
  check: Check;
};

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function isPositiveInt(value: unknown): boolean {
  return typeof value === 'number' && Number.isInteger(value) && value > 0;
}

function format(value: unknown): string {
  return typeof value === 'string' ? `"${value}"` : JSON.stringify(value);
}

function checkFilledString(value: unknown): string | null {
  if (typeof value !== 'string') return `must be a string (got ${format(value)})`;
  return value.trim() === '' ? 'is empty' : null;
}

function checkFilledStringArray(value: unknown): string | null {
  if (!Array.isArray(value)) return `must be an array (got ${format(value)})`;
  const items: unknown[] = value;
  // An empty array and an absent field mean the same thing to the UI, but only one of them is
  // honest: `ExerciseView` renders each section on `v-if`, so the field should be dropped instead.
  if (items.length === 0) return 'is an empty array — drop the field rather than leave it empty';
  const bad = items.findIndex((item) => typeof item !== 'string' || item.trim() === '');
  return bad === -1 ? null : `has an empty or non-string entry at index ${bad}`;
}

function checkTeaser(value: unknown): string | null {
  const issue = checkFilledString(value);
  if (issue !== null) return issue;
  const length = (value as string).length;
  return length > TEASER_CEILING
    ? `is ${length} chars — past ${TEASER_CEILING}, line-clamp-3 truncates it mid-word`
    : null;
}

const PROTOCOL_FIELDS: { [K in keyof Required<Protocol>]: Check } = {
  reps: (v) => (isPositiveInt(v) ? null : `must be an integer > 0 (got ${format(v)})`),
  sets: (v) => (isPositiveInt(v) ? null : `must be an integer > 0 (got ${format(v)})`),
  restSec: (v) => (isPositiveInt(v) ? null : `must be an integer > 0 (got ${format(v)})`),
  holdSec: (v) => (isPositiveInt(v) ? null : `must be an integer > 0 (got ${format(v)})`),
};

function checkProtocol(value: unknown): string | null {
  if (!isPlainObject(value)) return `must be an object (got ${format(value)})`;
  const keys = Object.keys(value);
  if (keys.length === 0) return 'is empty — drop the field rather than leave it empty';

  const unknownKeys = keys.filter((key) => !(key in PROTOCOL_FIELDS));
  if (unknownKeys.length > 0) return `has an unknown field: ${unknownKeys.join(', ')}`;

  for (const [name, check] of Object.entries(PROTOCOL_FIELDS)) {
    const field = value[name];
    if (field === undefined) continue;
    const issue = check(field);
    if (issue !== null) return `.${name} ${issue}`;
  }
  return null;
}

const CATEGORY_IDS: readonly string[] = CATEGORIES.map((category) => category.id);

// `level` is the one rule that restates its type: `Level` is a union of literals, and a union has
// no runtime representation to read back. Keep in step with `Level` in src/domain/exercise.ts.
const LEVELS: readonly unknown[] = [1, 2, 3];

const FIELDS: { [K in keyof Required<Exercise>]: FieldSpec<K> } = {
  id: {
    required: true,
    check: (v) => (isPositiveInt(v) ? null : `must be an integer > 0 (got ${format(v)})`),
  },
  title: { required: true, check: checkFilledString },
  teaser: { required: true, check: checkTeaser },
  categoryId: {
    required: true,
    check: (v) =>
      CATEGORY_IDS.includes(v as string)
        ? null
        : `must be one of ${CATEGORY_IDS.join(' | ')} (got ${format(v)})`,
  },
  tags: { required: true, check: checkFilledStringArray },
  level: {
    required: true,
    check: (v) => (LEVELS.includes(v) ? null : `must be 1 | 2 | 3 (got ${format(v)})`),
  },
  duration: {
    required: true,
    check: (v) =>
      isPositiveInt(v) ? null : `must be an integer > 0, in minutes (got ${format(v)})`,
  },
  protocol: { required: false, check: checkProtocol },
  equipment: { required: false, check: checkFilledStringArray },
  instructions: { required: false, check: checkFilledString },
  safety: { required: false, check: checkFilledString },
};

function fail(message: string): never {
  console.error(`✖ ${message}`);
  process.exit(1);
}

const verbose = process.argv.includes('--verbose');
const errors: string[] = [];
const warnings: string[] = [];

let parsed: unknown;
try {
  parsed = JSON.parse(readFileSync(DATA_PATH, 'utf8'));
} catch (error) {
  fail(`${DATA_PATH} is unreadable or not valid JSON: ${(error as Error).message}`);
}

if (!Array.isArray(parsed)) {
  fail('exercises.json must contain a bare array of exercises');
}

const entries: unknown[] = parsed;
const seenIds = new Map<number, number>();

entries.forEach((entry, index) => {
  if (!isPlainObject(entry)) {
    errors.push(`[${index}] must be an object (got ${format(entry)})`);
    return;
  }

  const id = entry['id'];
  const label = typeof id === 'number' ? `#${id}` : `[${index}]`;

  for (const key of Object.keys(entry)) {
    if (!(key in FIELDS)) errors.push(`${label} unknown field "${key}"`);
  }

  for (const [name, spec] of Object.entries(FIELDS)) {
    const value = entry[name];
    if (value === undefined) {
      if (spec.required) errors.push(`${label} required field "${name}" is missing`);
      continue;
    }
    const issue = spec.check(value);
    if (issue !== null) errors.push(`${label} ${name} ${issue}`);
  }

  if (typeof id === 'number') {
    const first = seenIds.get(id);
    if (first === undefined) seenIds.set(id, index);
    else errors.push(`${label} duplicate id (already used at index ${first})`);
  }

  const teaser = entry['teaser'];
  if (
    typeof teaser === 'string' &&
    teaser.length > TEASER_TARGET &&
    teaser.length <= TEASER_CEILING
  ) {
    warnings.push(`${label} teaser is ${teaser.length} chars (target ${TEASER_TARGET})`);
  }
});

const shown = verbose ? warnings : warnings.slice(0, 5);
for (const warning of shown) console.warn(`⚠ ${warning}`);
if (warnings.length > shown.length) {
  console.warn(`⚠ … and ${warnings.length - shown.length} more (--verbose to list them all)`);
}

for (const error of errors) console.error(`✖ ${error}`);

console.log(
  `\n${entries.length} exercises checked — ${errors.length} error(s), ${warnings.length} warning(s).`
);

if (errors.length > 0) {
  process.exit(1);
}

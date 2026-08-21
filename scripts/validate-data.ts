// scripts/validate-data.ts - contract check for the hand-authored catalogue. CI only, never shipped.
//
// `exercises.json` is *fetched* at runtime, never imported, so `vue-tsc` cannot see it: a renamed
// field or a `level: 4` type-checks clean and fails in the coach's browser, outdoors and offline.
// `FIELDS` closes that gap - it is a mapped type over `keyof Required<Exercise>`, so touching the
// interface fails `type-check` here until a rule exists. The gate cannot fall behind what it checks.
//
// Messages are English like the rest of the tooling; French is for catalogue content only.

import { readFileSync } from 'node:fs';
import process from 'node:process';
import { fileURLToPath } from 'node:url';
import { parseArgs } from 'node:util';

import { CATEGORIES, LEVELS } from '../src/domain/exercise.ts';
import type { Exercise, Variants } from '../src/domain/exercise.ts';

const DATA_PATH = fileURLToPath(new URL('../public/data/exercises.json', import.meta.url));

// --- Primitives ---

/** `null` = valid. Otherwise a message completing "<field> …", e.g. "must be an integer > 0". */
type Check = (value: unknown) => string | null;

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function isPositiveInt(value: unknown): boolean {
  return typeof value === 'number' && Number.isInteger(value) && value > 0;
}

// `JSON.stringify` is typed `: string` but returns `undefined` for `undefined`, so this used to hand
// back a non-string from a function that promised one. Long values are clipped: an error line naming
// the offending field is useful, one that dumps a 40-item array is not.
const MAX_SHOWN = 60;

function format(value: unknown): string {
  const text = typeof value === 'string' ? `"${value}"` : (JSON.stringify(value) ?? 'undefined');
  return text.length > MAX_SHOWN ? `${text.slice(0, MAX_SHOWN)}…` : text;
}

function positiveInt(unit = ''): Check {
  return (v) => (isPositiveInt(v) ? null : `must be an integer > 0${unit} (got ${format(v)})`);
}

// --- Shared checks ---

function filledString(value: unknown): string | null {
  if (typeof value !== 'string') return `must be a string (got ${format(value)})`;
  return value.trim() === '' ? 'is empty' : null;
}

// An empty array and an absent field look identical to the UI (sections render on `v-if`), but only
// one of them is honest - so an empty one is rejected rather than tolerated.
function filledStringArray(value: unknown): string | null {
  if (!Array.isArray(value)) return `must be an array (got ${format(value)})`;
  const items: unknown[] = value;
  if (items.length === 0) return 'is an empty array - drop the field rather than leave it empty';
  const bad = items.findIndex((item) => typeof item !== 'string' || item.trim() === '');
  return bad === -1 ? null : `has an empty or non-string entry at index ${bad}`;
}

// --- Teaser budgets (DESIGN §5.1) ---
// Both numbers are the *390px* budget (~38 chars/line) and mean nothing without that width; 360px
// would need ~90. Past the ceiling `line-clamp-3` truncates mid-word - an error. Past the target the
// card stops being title-led - a real regression but an editorial one, so it only warns. §5.1 forbids
// hardening it. (That tier is now nearly quiet: re-measured 2026-08-21, 4 of 123 teasers sit above
// the target and none reaches the ceiling - the rewrite it was waiting on has happened.)

const TEASER_CEILING = 100;
const TEASER_TARGET = 70;

function teaser(value: unknown): string | null {
  const issue = filledString(value);
  if (issue !== null) return issue;
  const { length } = value as string;
  return length > TEASER_CEILING
    ? `is ${length} chars - past ${TEASER_CEILING}, line-clamp-3 truncates it mid-word`
    : null;
}

/** Warning tier of the same budget - an error is never also a warning. */
function teaserWarning(value: unknown): string | null {
  if (typeof value !== 'string') return null;
  const { length } = value;
  return length > TEASER_TARGET && length <= TEASER_CEILING
    ? `teaser is ${length} chars (target ${TEASER_TARGET})`
    : null;
}

// --- Nested: variants ---

// Same mapped-type coupling as `FIELDS`, one level down.
const VARIANT_FIELDS: { [K in keyof Required<Variants>]: Check } = {
  harder: filledStringArray,
  easier: filledStringArray,
};

function variants(value: unknown): string | null {
  if (!isPlainObject(value)) return `must be an object (got ${format(value)})`;
  const keys = Object.keys(value);
  if (keys.length === 0) return 'is empty - drop the field rather than leave it empty';

  // `Object.hasOwn`, never `in`: `in` walks the prototype chain, so a variant field named `toString`
  // or `constructor` was accepted as *known* and then never checked by the loop below.
  const unexpected = keys.filter((key) => !Object.hasOwn(VARIANT_FIELDS, key));
  if (unexpected.length > 0) return `has an unknown field: ${unexpected.join(', ')}`;

  for (const [name, check] of Object.entries(VARIANT_FIELDS)) {
    const issue = value[name] === undefined ? null : check(value[name]);
    if (issue !== null) return `.${name} ${issue}`;
  }
  return null;
}

// --- The contract ---

const CATEGORY_IDS: readonly string[] = CATEGORIES.map((category) => category.id);

// Both read off the domain, so neither can drift from what it checks. `LEVELS` used to be restated
// here as [1, 2, 3] - `Level` is a union of literals with no runtime form - but the ordered list the
// filter sheet renders gives that union a runtime shape, and this reads it back.
const LEVEL_VALUES: readonly unknown[] = LEVELS.map((level) => level.value);

type FieldSpec<K extends keyof Exercise> = {
  // Read off `Exercise` itself, so a flag contradicting the interface is a compile error.
  required: undefined extends Exercise[K] ? false : true;
  check: Check;
};

const FIELDS: { [K in keyof Required<Exercise>]: FieldSpec<K> } = {
  id: { required: true, check: positiveInt() },
  title: { required: true, check: filledString },
  teaser: { required: true, check: teaser },
  categoryId: {
    required: true,
    check: (v) =>
      CATEGORY_IDS.includes(v as string)
        ? null
        : `must be one of ${CATEGORY_IDS.join(' | ')} (got ${format(v)})`,
  },
  tags: { required: true, check: filledStringArray },
  level: {
    required: true,
    check: (v) =>
      LEVEL_VALUES.includes(v) ? null : `must be ${LEVEL_VALUES.join(' | ')} (got ${format(v)})`,
  },
  duration: { required: true, check: positiveInt(', in minutes') },
  objective: { required: false, check: filledString },
  equipment: { required: false, check: filledStringArray },
  instructions: { required: false, check: filledStringArray },
  variants: { required: false, check: variants },
  safety: { required: false, check: filledString },
};

// --- Run ---

function fail(message: string): never {
  throw new Error(message);
}

// Hoisted: `Object.entries` rebuilt a 12-pair array, and 12 tuples, once per catalogue entry.
const FIELD_ENTRIES = Object.entries(FIELDS);

function main(): void {
  // `parseArgs` rather than a scan of `process.argv`, for the reason the sibling script spells out:
  // `-- --verbos` was silently ignored, which is the failure mode a hand-rolled scan invites.
  const { values } = parseArgs({ options: { verbose: { type: 'boolean', default: false } } });

  let parsed: unknown;
  try {
    parsed = JSON.parse(readFileSync(DATA_PATH, 'utf8'));
  } catch (error) {
    fail(
      `${DATA_PATH} is unreadable or not valid JSON: ${error instanceof Error ? error.message : String(error)}`
    );
  }
  if (!Array.isArray(parsed)) fail('exercises.json must contain a bare array of exercises');

  const entries: unknown[] = parsed;
  const errors: string[] = [];
  const warnings: string[] = [];
  const seenIds = new Map<number, number>();

  entries.forEach((entry, index) => {
    if (!isPlainObject(entry)) {
      errors.push(`[${index}] must be an object (got ${format(entry)})`);
      return;
    }

    const id = entry['id'];
    const label = typeof id === 'number' ? `#${id}` : `[${index}]`;

    for (const key of Object.keys(entry)) {
      // Same prototype hole as `VARIANT_FIELDS` above: `'constructor' in FIELDS` is `true`.
      if (!Object.hasOwn(FIELDS, key)) errors.push(`${label} unknown field "${key}"`);
    }

    for (const [name, spec] of FIELD_ENTRIES) {
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

    const warning = teaserWarning(entry['teaser']);
    if (warning !== null) warnings.push(`${label} ${warning}`);
  });

  // --- Report ---

  const shown = values.verbose ? warnings : warnings.slice(0, 5);
  for (const warning of shown) console.warn(`⚠ ${warning}`);
  if (warnings.length > shown.length) {
    console.warn(`⚠ … and ${warnings.length - shown.length} more (--verbose to list them all)`);
  }

  for (const error of errors) console.error(`✖ ${error}`);

  console.log(
    `\n${entries.length} exercises checked - ${errors.length} error(s), ${warnings.length} warning(s).`
  );

  // `exitCode`, not `process.exit()`: on a piped stdout - which is exactly what CI gives us -
  // `process.exit` does not flush pending writes, so the summary above could be lost on precisely
  // the run that failed. Setting the code lets the process end on its own, once stdout has drained.
  if (errors.length > 0) process.exitCode = 1;
}

try {
  main();
} catch (error) {
  console.error(`✖ ${error instanceof Error ? error.message : String(error)}`);
  process.exitCode = 1;
}

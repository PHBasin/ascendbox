// scripts/lib/exercise-contract.ts — the data contract, as a pure function. CI only, never shipped.
//
// `exercises.json` is *fetched* at runtime, never imported, so `vue-tsc` cannot see it: a renamed
// field or a `level: 4` type-checks clean and fails in the coach's browser, outdoors and offline.
// `FIELDS` closes that gap — it is a mapped type over `keyof Required<Exercise>`, so touching the
// interface fails `type-check` here until a rule exists. The gate cannot fall behind what it checks.
//
// It lives apart from `validate-data.ts` so that *every* road into the catalogue runs the same rules:
// the CI gate (`npm run validate:data`) reads a file and exits, the CSV importer
// (`scripts/exercises-csv.ts`) checks a payload it has not written yet. Same verdict, one copy of it —
// a second, drifting transcription of the contract would be worse than no check at all.
//
// Messages are English like the rest of the tooling; French is for catalogue content only.

import { CATEGORIES, LEVELS } from '../../src/domain/exercise.ts';
import type { Exercise, Variants } from '../../src/domain/exercise.ts';

// --- Primitives ---

/** `null` = valid. Otherwise a message completing "<field> …", e.g. "must be an integer > 0". */
type Check = (value: unknown) => string | null;

export function isPlainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function isPositiveInt(value: unknown): boolean {
  return typeof value === 'number' && Number.isInteger(value) && value > 0;
}

function format(value: unknown): string {
  return typeof value === 'string' ? `"${value}"` : JSON.stringify(value);
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
// one of them is honest — so an empty one is rejected rather than tolerated.
function filledStringArray(value: unknown): string | null {
  if (!Array.isArray(value)) return `must be an array (got ${format(value)})`;
  const items: unknown[] = value;
  if (items.length === 0) return 'is an empty array — drop the field rather than leave it empty';
  const bad = items.findIndex((item) => typeof item !== 'string' || item.trim() === '');
  return bad === -1 ? null : `has an empty or non-string entry at index ${bad}`;
}

// --- Teaser budgets (DESIGN §5.1) ---
// Both numbers are the *390px* budget (~38 chars/line) and mean nothing without that width; 360px
// would need ~90. Past the ceiling `line-clamp-3` truncates mid-word — an error. Past the target the
// card stops being title-led — a real regression but an editorial one, and 92 of 100 teasers sit
// there pending the teaser/instructions rewrite, so it only warns. §5.1 forbids hardening it.

const TEASER_CEILING = 100;
const TEASER_TARGET = 70;

function teaser(value: unknown): string | null {
  const issue = filledString(value);
  if (issue !== null) return issue;
  const { length } = value as string;
  return length > TEASER_CEILING
    ? `is ${length} chars — past ${TEASER_CEILING}, line-clamp-3 truncates it mid-word`
    : null;
}

/** Warning tier of the same budget — an error is never also a warning. */
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
  if (keys.length === 0) return 'is empty — drop the field rather than leave it empty';

  const unknown = keys.filter((key) => !(key in VARIANT_FIELDS));
  if (unknown.length > 0) return `has an unknown field: ${unknown.join(', ')}`;

  for (const [name, check] of Object.entries(VARIANT_FIELDS)) {
    const issue = value[name] === undefined ? null : check(value[name]);
    if (issue !== null) return `.${name} ${issue}`;
  }
  return null;
}

// --- The contract ---

const CATEGORY_IDS: readonly string[] = CATEGORIES.map((category) => category.id);

// Both read off the domain, so neither can drift from what it checks. `LEVELS` used to be restated
// here as [1, 2, 3] — `Level` is a union of literals with no runtime form — but the ordered list the
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

/** Every field the contract knows, in interface order — the CSV codec reads its columns off this. */
export const FIELD_NAMES = Object.keys(FIELDS) as (keyof Required<Exercise>)[];

// --- Run ---

export interface ContractReport {
  /** Entries examined — 0 when the payload was not an array at all. */
  count: number;
  /** Blocking: the app would break, or the data lies. */
  errors: string[];
  /** Editorial only (the teaser budget, DESIGN §5.1) — never blocking. */
  warnings: string[];
}

/**
 * Check a parsed `exercises.json` payload against the contract. Pure: no I/O, no `process.exit`, so
 * it serves both the CI gate and the CSV importer — which must reject *before* writing a file.
 */
export function validateExercises(payload: unknown): ContractReport {
  const errors: string[] = [];
  const warnings: string[] = [];

  if (!Array.isArray(payload)) {
    return {
      count: 0,
      errors: ['exercises.json must contain a bare array of exercises'],
      warnings,
    };
  }

  const entries: unknown[] = payload;
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

    const warning = teaserWarning(entry['teaser']);
    if (warning !== null) warnings.push(`${label} ${warning}`);
  });

  return { count: entries.length, errors, warnings };
}

/**
 * Print a report the way the CI gate does — warnings first (capped unless `verbose`), then errors,
 * then the tally. Returns `true` when the payload is clean enough to keep.
 */
export function reportContract(report: ContractReport, verbose = false): boolean {
  const shown = verbose ? report.warnings : report.warnings.slice(0, 5);
  for (const warning of shown) console.warn(`⚠ ${warning}`);
  if (report.warnings.length > shown.length) {
    console.warn(
      `⚠ … and ${report.warnings.length - shown.length} more (--verbose to list them all)`
    );
  }

  for (const error of report.errors) console.error(`✖ ${error}`);

  console.log(
    `\n${report.count} exercises checked — ${report.errors.length} error(s), ${report.warnings.length} warning(s).`
  );

  return report.errors.length === 0;
}

// scripts/catalogue.ts - what `validate-data.ts` and `exercises-csv.ts` both need. Tooling only.
//
// The two scripts had drifted into four copies of the same code: `isPlainObject` byte-identical in
// both, the error-to-message ternary five times over, the `#id` / `[index]` entry label as a
// function in one and inline in the other, and - the one that mattered - the **same catalogue path
// under two different names** (`DATA_PATH` and `CATALOGUE_PATH`). Two names for one file is how two
// tools end up disagreeing about which file they operate on.
//
// Messages are English like the rest of the tooling; French is for catalogue content only.

import { fileURLToPath } from 'node:url';

/** The hand-authored catalogue. One expression, one name, both scripts. */
export const CATALOGUE_PATH = fileURLToPath(
  new URL('../public/data/exercises.json', import.meta.url)
);

/** Arrays are objects; every caller here means "a record with fields", so they are excluded. */
export function isPlainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

/**
 * A thrown value's message. `catch` binds `unknown`, and a non-`Error` throw rendered through
 * `.message` prints the literal `undefined` - the least useful thing a failing run can say.
 */
export function messageOf(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

/**
 * How an entry is named in a report: its id when it has one, otherwise its position.
 *
 * The position is the fallback precisely because a *missing or malformed* id is one of the things
 * being reported - a message that cannot name the row it is about costs the coach a manual hunt.
 */
export function entryLabel(entry: Record<string, unknown>, index: number): string {
  const id = entry['id'];
  return typeof id === 'number' ? `#${String(id)}` : `[${String(index)}]`;
}

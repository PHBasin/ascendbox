// scripts/lib/exercise-csv.ts — the Exercise ⇄ CSV mapping. Pure: no I/O, no process, no console.
//
// Kept free of side effects so it can be unit-tested the day a runner lands, and so the CLI above it
// stays a thin orchestration layer. Encoding and decoding live together because they are one
// contract read in two directions — splitting them would let the two halves disagree.
//
// Messages are English like the rest of the tooling; French is for catalogue content only.

import { parse } from 'csv-parse/sync';
import { stringify } from 'csv-stringify/sync';

import type { Exercise, Variants } from '../../src/domain/exercise.ts';

/** The constraint this tool was written to, and what a French Excel expects without an import wizard. */
export const CSV_DELIMITER = ';';

// Multi-value fields collapse into one cell rather than into numbered columns, because
// `instructions` has no fixed length and an `instructions_1…9` header would cap what a coach writes.
const LIST_SEPARATOR = '|';
const LIST_JOIN = ` ${LIST_SEPARATOR} `;

/**
 * How a field survives the trip through a flat cell. `variants` is the only one that is neither
 * scalar nor list — it spans two columns, one per adaptation direction.
 */
type FieldKind = 'int' | 'text' | 'list' | 'variants';

// Mapped over `keyof Required<Exercise>`, exactly as `FIELDS` is in `validate-data.ts`: a field added
// to the interface fails `type-check` here until it is given a kind, so a round trip can never
// silently drop one. Declaration order is the column order and the written JSON key order.
const FIELD_KINDS: { [K in keyof Required<Exercise>]: FieldKind } = {
  id: 'int',
  title: 'text',
  teaser: 'text',
  categoryId: 'text',
  tags: 'list',
  level: 'int',
  duration: 'int',
  objective: 'text',
  equipment: 'list',
  instructions: 'list',
  variants: 'variants',
  safety: 'text',
};

const VARIANT_HEADERS: { [K in keyof Required<Variants>]: string } = {
  harder: 'variants.harder',
  easier: 'variants.easier',
};

const FIELD_NAMES = Object.keys(FIELD_KINDS) as (keyof Required<Exercise>)[];
const VARIANT_KEYS = Object.keys(VARIANT_HEADERS) as (keyof Required<Variants>)[];

interface Column {
  header: string;
  field: keyof Required<Exercise>;
  kind: FieldKind;
  /** Set only on the two `variants.*` columns. */
  variantKey?: keyof Required<Variants>;
}

const COLUMNS: readonly Column[] = FIELD_NAMES.flatMap((field): Column[] => {
  const kind = FIELD_KINDS[field];
  if (kind !== 'variants') return [{ header: field, field, kind }];
  return VARIANT_KEYS.map((variantKey) => ({
    header: VARIANT_HEADERS[variantKey],
    field,
    kind,
    variantKey,
  }));
});

const HEADERS: readonly string[] = COLUMNS.map((column) => column.header);

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function label(entry: Record<string, unknown>, index: number): string {
  return typeof entry['id'] === 'number' ? `#${String(entry['id'])}` : `[${String(index)}]`;
}

// --- Encoding ---

function formatList(value: unknown): string {
  if (!Array.isArray(value)) return '';
  const items: unknown[] = value;
  return items.filter((item) => typeof item === 'string').join(LIST_JOIN);
}

function formatCell(entry: Record<string, unknown>, column: Column): string {
  const value = entry[column.field];
  if (value === undefined) return '';

  switch (column.kind) {
    case 'int':
      return typeof value === 'number' ? String(value) : '';
    case 'text':
      return typeof value === 'string' ? value : '';
    case 'list':
      return formatList(value);
    case 'variants':
      return isPlainObject(value) && column.variantKey !== undefined
        ? formatList(value[column.variantKey])
        : '';
  }
}

/**
 * Callers must run {@link findListSeparatorConflicts} first: a `|` already inside a value would come
 * back as an extra list item, and encoding cannot refuse on its own without doing I/O.
 */
export function encodeExercises(entries: readonly unknown[]): string {
  const records = entries.map((entry) => {
    const source = isPlainObject(entry) ? entry : {};
    return Object.fromEntries(COLUMNS.map((column) => [column.header, formatCell(source, column)]));
  });

  return stringify(records, {
    columns: [...HEADERS],
    header: true,
    delimiter: CSV_DELIMITER,
    record_delimiter: 'windows',
    // Without it Excel reads UTF-8 as Latin-1 and "récupération" becomes "rÃ©cupÃ©ration".
    bom: true,
    // The library quotes on its own delimiter but leaves a lone \n bare, which any parser reading LF
    // records would split mid-field. RFC 4180 wants it quoted; this asks for that explicitly.
    quoted_match: /[\r\n]/,
  });
}

/** Values that would not survive the trip back, reported per exercise rather than silently mangled. */
export function findListSeparatorConflicts(entries: readonly unknown[]): string[] {
  return entries.flatMap((entry, index) => {
    if (!isPlainObject(entry)) return [];

    return COLUMNS.flatMap((column) => {
      const value = entry[column.field];
      const list =
        column.variantKey !== undefined && isPlainObject(value) ? value[column.variantKey] : value;
      if (!Array.isArray(list)) return [];

      const items: unknown[] = list;
      return items.flatMap((item, position) =>
        typeof item === 'string' && item.includes(LIST_SEPARATOR)
          ? [
              `${label(entry, index)} ${column.header}[${String(position)}] contains "${LIST_SEPARATOR}", the list separator`,
            ]
          : []
      );
    });
  });
}

// --- Decoding ---

/** An empty cell means the field is absent, never `""` — optional is load-bearing (DESIGN §5.6). */
function parseList(raw: string): string[] | undefined {
  const items = raw
    .split(LIST_SEPARATOR)
    .map((item) => item.trim())
    .filter((item) => item !== '');
  return items.length > 0 ? items : undefined;
}

/**
 * A number when it reads as one, the raw string otherwise — so `level;abc` reaches the contract as
 * `level must be 1 | 2 | 3 (got "abc")` instead of a silent `NaN`. Making bad input legible is this
 * function's job; rejecting it is the validator's.
 */
function parseNumber(raw: string): number | string | undefined {
  const trimmed = raw.trim();
  if (trimmed === '') return undefined;
  if (!/^-?\d+(?:[.,]\d+)?$/.test(trimmed)) return trimmed;
  return Number(trimmed.replace(',', '.'));
}

function parseCell(raw: string, kind: FieldKind): unknown {
  switch (kind) {
    case 'int':
      return parseNumber(raw);
    case 'text':
      return raw.trim() === '' ? undefined : raw.trim();
    case 'list':
    case 'variants':
      return parseList(raw);
  }
}

function toEntry(record: Record<string, string>): Record<string, unknown> {
  const entry: Record<string, unknown> = {};
  const variants: Record<string, unknown> = {};

  for (const column of COLUMNS) {
    const value = parseCell(record[column.header] ?? '', column.kind);
    if (value === undefined) continue;

    if (column.variantKey === undefined) entry[column.field] = value;
    else variants[column.variantKey] = value;
  }

  // Absent rather than `{}` — the contract rejects an empty object, and rightly so.
  if (Object.keys(variants).length > 0) entry['variants'] = variants;

  // Interface order regardless of the column order in the file, so a round trip stays a no-op on the
  // JSON diff even after a coach has dragged columns around in the spreadsheet.
  return Object.fromEntries(
    FIELD_NAMES.filter((field) => entry[field] !== undefined).map((field) => [field, entry[field]])
  );
}

/**
 * Every column is required in the header even when its field is optional: a dropped column would
 * erase that field for the whole catalogue, which is the quiet data loss a spreadsheet invites.
 */
function findHeaderIssues(header: readonly string[]): string[] {
  const issues: string[] = [];
  const seen = new Set<string>();

  for (const name of header) {
    if (!HEADERS.includes(name)) issues.push(`unknown column "${name}"`);
    else if (seen.has(name)) issues.push(`duplicate column "${name}"`);
    seen.add(name);
  }

  const missing = HEADERS.filter((name) => !header.includes(name));
  if (missing.length > 0) issues.push(`missing column(s): ${missing.join(', ')}`);

  return issues;
}

export interface DecodeResult {
  entries: Record<string, unknown>[];
  /** Structural faults — malformed CSV or a bad header. Empty means the contract can have its turn. */
  errors: string[];
}

export function decodeExercises(csv: string): DecodeResult {
  const headerIssues: string[] = [];
  let records: Record<string, string>[];

  try {
    records = parse(csv, {
      delimiter: CSV_DELIMITER,
      bom: true,
      trim: true,
      skip_empty_lines: true,
      // The library's own hook: it hands over the raw header, duplicates included, which `columns:
      // true` would silently collapse.
      columns: (header: string[]) => {
        headerIssues.push(...findHeaderIssues(header.map((name) => name.trim())));
        return header.map((name) => name.trim());
      },
    });
  } catch (error) {
    // csv-parse raises typed codes (CSV_RECORD_INCONSISTENT_COLUMNS, CSV_QUOTE_NOT_CLOSED…) whose
    // messages already name the offending line, so they are passed through rather than paraphrased.
    // The header hook has already run by then, so its findings ride along — a bad row must not hide
    // a bad header and cost the coach a second round trip.
    return { entries: [], errors: [...headerIssues, (error as Error).message] };
  }

  if (headerIssues.length > 0) return { entries: [], errors: headerIssues };

  // An empty array is valid JSON *and* passes the contract — `validate:data` on a wiped catalogue
  // reports "0 exercises checked, 0 errors". So a header-only file would erase everything and every
  // downstream check would agree it went fine. This is the only place that can catch it.
  if (records.length === 0) {
    return { entries: [], errors: ['no exercise row — refusing to empty the catalogue'] };
  }

  return { entries: records.map(toEntry), errors: [] };
}

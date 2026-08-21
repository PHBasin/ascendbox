// scripts/exercises-csv.ts - JSON ⇄ CSV for the catalogue. Tooling only, never shipped.
//
// Why it exists: `public/data/exercises.json` is hand-authored, and the people who author it are
// coaches, not developers. A spreadsheet is the tool they already have.
//
//   npm run data:export -- [--out fichier.csv]   JSON → CSV
//   npm run data:import -- [--in fichier.csv]    CSV → JSON
//
// It converts, and nothing else. Checking the *content* is `npm run validate:data` - the existing
// gate, unchanged and unwrapped - run after an import. Two commands, one job each, rather than one
// command with an opinion about when the other should fire.
//
// The refusals below are all about the *conversion* being faithful, never about the data being good:
// a `|` inside a value, a header that does not match the columns, a file with no data row. Each one
// is a silent corruption if it goes through.
//
// Dialect: `;` separator - the constraint this tool was written to, and what a French Excel expects
// without an import wizard; RFC 4180 quoting, which is what makes `;` safe inside a teaser; CRLF and
// a UTF-8 BOM so Excel opens the accents right. `csv-parse` / `csv-stringify` do the parsing and the
// quoting; this file only maps fields to cells.
//
// Messages are English like the rest of the tooling; French is for catalogue content only.

import { readFileSync, renameSync, unlinkSync, writeFileSync } from 'node:fs';
import process from 'node:process';
import { fileURLToPath } from 'node:url';
import { parseArgs } from 'node:util';

import { parse } from 'csv-parse/sync';
import { stringify } from 'csv-stringify/sync';

import type { Exercise, Variants } from '../src/domain/exercise.ts';

const CSV_DELIMITER = ';';

// Multi-value fields collapse into one cell rather than into numbered columns, because
// `instructions` has no fixed length and an `instructions_1…9` header would cap what a coach writes.
const LIST_SEPARATOR = '|';
const LIST_JOIN = ` ${LIST_SEPARATOR} `;

const CATALOGUE_PATH = fileURLToPath(new URL('../public/data/exercises.json', import.meta.url));
const DEFAULT_CSV_PATH = fileURLToPath(new URL('../exercises.csv', import.meta.url));

// --- Columns, derived from the domain ---

/**
 * How a field survives the trip through a flat cell. `variants` is the only one that is neither
 * scalar nor list - it spans two columns, one per adaptation direction.
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

// --- JSON → CSV ---

// A value of the wrong runtime type is `validate:data`'s to report, not the converter's to hide.
// Dropping it would empty the cell, so the coach could not even see what to correct — and the export
// is *expected* to run on JSON that is not green yet, since fixing it in a spreadsheet is the point.
// Scalars therefore go through as text; only a nested object has no honest one-cell form. An absent
// value stays a gap, and a gap must stay a non-event: the catalogue is authored incrementally, so
// most optional fields are missing on most entries.
function formatScalar(value: unknown): string {
  if (typeof value === 'string') return value;
  if (typeof value === 'number' || typeof value === 'boolean') return String(value);
  return '';
}

function formatList(value: unknown): string {
  if (!Array.isArray(value)) return formatScalar(value);
  const items: unknown[] = value;
  return items.map(formatScalar).join(LIST_JOIN);
}

function formatCell(entry: Record<string, unknown>, column: Column): string {
  const value = entry[column.field];
  if (value === undefined) return '';

  switch (column.kind) {
    case 'int':
    case 'text':
      return formatScalar(value);
    case 'list':
      return formatList(value);
    case 'variants':
      return isPlainObject(value) && column.variantKey !== undefined
        ? formatList(value[column.variantKey])
        : '';
  }
}

function encodeExercises(entries: readonly unknown[]): string {
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

/** A `|` already inside a value would come back as an extra list item, so export refuses instead. */
function findListSeparatorConflicts(entries: readonly unknown[]): string[] {
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

// --- CSV → JSON ---

/** An empty cell means the field is absent, never `""` - optional is load-bearing (DESIGN §5.6). */
function parseList(raw: string): string[] | undefined {
  const items = raw
    .split(LIST_SEPARATOR)
    .map((item) => item.trim())
    .filter((item) => item !== '');
  return items.length > 0 ? items : undefined;
}

/**
 * A number when it reads as one, the raw string otherwise - so `level;abc` reaches `validate:data` as
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

  // Absent rather than `{}` - the contract rejects an empty object, and rightly so.
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

interface DecodeResult {
  entries: Record<string, unknown>[];
  /** Structural faults - malformed CSV, or a header that does not match the columns. */
  errors: string[];
}

// U+FFFD is what a byte that is not valid UTF-8 decodes to. It is never typed by a human, so its
// presence means the file was saved in another encoding - Excel's plain "CSV (séparateur
// point-virgule)" writes Windows-1252. Nothing else notices: the decode does not throw, the CSV
// parses, the contract passes, and "récupération" lands in the catalogue as "r?cup?ration".
const REPLACEMENT_CHARACTER = '\uFFFD';

function decodeExercises(csv: string): DecodeResult {
  if (csv.includes(REPLACEMENT_CHARACTER)) {
    return {
      entries: [],
      errors: [
        'the file is not UTF-8 (accents are already lost on read) - re-save it as "CSV UTF-8" from the spreadsheet',
      ],
    };
  }

  const headerIssues: string[] = [];
  let records: Record<string, string>[];

  try {
    records = parse(csv, {
      delimiter: CSV_DELIMITER,
      bom: true,
      trim: true,
      skip_empty_lines: true,
      // Excel and LibreOffice emit a row of empty cells when someone clicks below the data and
      // saves. `skip_empty_lines` does not catch it (it has delimiters), so it would map to `{}` and
      // land in the catalogue as a bare empty object.
      skip_records_with_empty_values: true,
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
    // The header hook has already run by then, so its findings ride along - a bad row must not hide
    // a bad header and cost the coach a second round trip.
    return { entries: [], errors: [...headerIssues, (error as Error).message] };
  }

  if (headerIssues.length > 0) return { entries: [], errors: headerIssues };

  // An empty array is valid JSON *and* passes the contract - `validate:data` on a wiped catalogue
  // reports "0 exercises checked, 0 errors". So a header-only file would erase everything and every
  // downstream check would agree it went fine. This is the only place that can catch it.
  if (records.length === 0) {
    return { entries: [], errors: ['no exercise row - refusing to empty the catalogue'] };
  }

  return { entries: records.map(toEntry), errors: [] };
}

// --- Files ---

function readTextFile(path: string): string {
  try {
    return readFileSync(path, 'utf8');
  } catch (error) {
    throw new Error(
      `${path} is unreadable: ${error instanceof Error ? error.message : String(error)}`,
      { cause: error }
    );
  }
}

/**
 * Write via a temporary file and a rename, which is atomic on the same filesystem.
 *
 * `writeFileSync` truncates first and fills after: a crash, a full disk or a killed terminal between
 * the two leaves `exercises.json` half-written - the catalogue destroyed by the tool meant to edit
 * it. The rename means the target is either the old file or the new one, never a fragment.
 */
function writeTextFile(path: string, contents: string): void {
  const temporary = `${path}.tmp`;
  try {
    writeFileSync(temporary, contents, 'utf8');
    renameSync(temporary, path);
  } catch (error) {
    try {
      unlinkSync(temporary);
    } catch {
      // Nothing to clean up, or nothing we can do about it - the failure below is the one that matters.
    }
    throw new Error(
      `${path} could not be written: ${error instanceof Error ? error.message : String(error)}`,
      { cause: error }
    );
  }
}

function readExercises(path: string): unknown[] {
  const parsed: unknown = JSON.parse(readTextFile(path));
  if (!Array.isArray(parsed)) throw new Error(`${path} must contain a bare array of exercises`);
  return parsed as unknown[];
}

/** Two-space indent and a trailing newline: what the hand-authored file and Prettier both use. */
function writeExercises(path: string, entries: readonly unknown[]): void {
  writeTextFile(path, `${JSON.stringify(entries, null, 2)}\n`);
}

// --- Commands ---

interface Options {
  source?: string | undefined;
  target?: string | undefined;
}

function refuse(issues: readonly string[], summary: string): never {
  for (const issue of issues) console.error(`✖ ${issue}`);
  throw new Error(summary);
}

function runExport({ source = CATALOGUE_PATH, target = DEFAULT_CSV_PATH }: Options): void {
  const entries = readExercises(source);

  const conflicts = findListSeparatorConflicts(entries);
  if (conflicts.length > 0) refuse(conflicts, 'the CSV would not survive the trip back.');

  writeTextFile(target, encodeExercises(entries));
  console.log(`→ ${String(entries.length)} exercises → ${target}`);
}

function runImport({ source = DEFAULT_CSV_PATH, target = CATALOGUE_PATH }: Options): void {
  const { entries, errors } = decodeExercises(readTextFile(source));
  if (errors.length > 0) refuse(errors, `${source} is malformed.`);

  writeExercises(target, entries);
  console.log(`→ ${String(entries.length)} exercises → ${target}`);
  console.log('  run `npm run validate:data` to check the content.');
}

const COMMANDS: Record<string, (options: Options) => void> = {
  export: runExport,
  import: runImport,
};

// --- CLI ---

const USAGE = `Usage: node scripts/exercises-csv.ts <export|import> [--in <path>] [--out <path>]

  export   JSON → CSV   --in ${CATALOGUE_PATH}
                        --out ${DEFAULT_CSV_PATH}
  import   CSV → JSON   --in ${DEFAULT_CSV_PATH}
                        --out ${CATALOGUE_PATH}

Converting is all this does. Run \`npm run validate:data\` after an import to check the content.
CSV dialect: "${CSV_DELIMITER}" separator, RFC 4180 quoting, CRLF, UTF-8 BOM; list cells " | "-separated.`;

function readCommand(): { run: (options: Options) => void; options: Options } {
  // `parseArgs` is native and rejects an unknown flag, so a typo is an error rather than a silent
  // fallback to the default path - the failure mode a hand-rolled argv scan invites.
  const { values, positionals } = parseArgs({
    options: { in: { type: 'string' }, out: { type: 'string' } },
    allowPositionals: true,
  });

  const [command, ...extra] = positionals;
  // `Object.hasOwn`, never a bare index: `COMMANDS['toString']` resolved to `Object.prototype`'s own
  // method, sailed past the `undefined` guard below, was *called*, printed nothing and exited 0 -
  // a command that silently does nothing is worse than one that is rejected.
  const run =
    command !== undefined && Object.hasOwn(COMMANDS, command) ? COMMANDS[command] : undefined;
  if (run === undefined) {
    throw new Error(
      `${command === undefined ? 'no command given' : `unknown command "${command}"`}\n\n${USAGE}`
    );
  }
  // A path given positionally rather than via --in/--out would otherwise be dropped on the floor and
  // the default file used instead — the silent fallback this whole function exists to prevent. It is
  // the destructive direction that matters: `data:import -- mes-exercices.csv` would read a stale
  // `exercises.csv` and overwrite the catalogue with it, and `validate:data` would call it clean.
  if (extra.length > 0) {
    throw new Error(`unexpected argument "${extra[0]}" — paths go to --in/--out\n\n${USAGE}`);
  }
  // The shape of argv was checked; the *targets* were not. `data:export -- --out public/data/exercises.json`
  // writes CSV over the catalogue, and every downstream check would then agree the JSON is unreadable
  // rather than say what happened.
  if (values.in !== undefined && values.in === values.out) {
    throw new Error(
      `--in and --out are the same file ("${values.in}") - one would overwrite the other`
    );
  }

  return { run, options: { source: values.in, target: values.out } };
}

try {
  const { run, options } = readCommand();
  run(options);
} catch (error) {
  console.error(`✖ ${error instanceof Error ? error.message : String(error)}`);
  // `exitCode`, not `process.exit()`: the latter does not flush a piped stdout, so the ✖ lines above
  // could be lost on exactly the run that failed.
  process.exitCode = 1;
}

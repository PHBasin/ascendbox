// scripts/exercises-csv.ts — JSON ⇄ CSV for the catalogue. Tooling only, never shipped.
//
// Why it exists: `public/data/exercises.json` is hand-authored, and the people who author it are
// coaches, not developers. A spreadsheet is the tool they already have — but a spreadsheet is also
// the easiest way to quietly break a contract nothing re-checks.
//
// So this file contains **no validation of its own**. It shells out to `scripts/validate-data.ts` —
// the very script `npm run validate:data` runs, in its own process, on a real file — and obeys its
// exit code. Not a copy of the rules, not a refactor of them: the same gate, invoked. On import the
// JSON is staged to a temporary file and validated *there*, so a CSV that violates the contract
// never reaches `exercises.json`; a clean one is moved into place with an atomic rename.
//
//   npm run data:export -- [--out fichier.csv]   JSON → CSV (validates the source first)
//   npm run data:import -- [--in fichier.csv]    CSV → JSON (validates, then writes; --dry-run to
//                                                 stop at the verdict)
//   npm run data:verify                          JSON → CSV → JSON in memory, diffed. The fidelity
//                                                 proof, since the repo has no test runner.
//
// Dialect (deliberate, and both legs share it): `;` separator — the constraint this tool was written
// to, and what a French Excel expects by default; RFC 4180 quoting, which is what makes `;` safe
// inside a teaser; CRLF endings and a UTF-8 BOM, so Excel opens the accents right without an import
// wizard. Multi-value fields (`tags`, `instructions`, …) collapse to one ` | `-separated cell rather
// than to numbered columns: `instructions` has no fixed length, and a 9-column `instructions_1…9`
// header would cap what a coach can write.
//
// Messages are English like the rest of the tooling; French is for catalogue content only.

import { spawnSync } from 'node:child_process';
import { readFileSync, renameSync, rmSync, writeFileSync } from 'node:fs';
import process from 'node:process';
import { fileURLToPath } from 'node:url';

import type { Exercise, Variants } from '../src/domain/exercise.ts';

// --- The dialect ---

/** Hard requirement, not a preference — read the module header. */
const DELIMITER = ';';
/** Separates the items of a list cell. Written padded, read unpadded. */
const LIST_SEPARATOR = '|';
const LIST_JOIN = ` ${LIST_SEPARATOR} `;
/** Excel on Windows still expects CRLF; every parser accepts it, and this one accepts bare LF too. */
const EOL = '\r\n';
/** Without it Excel reads UTF-8 as Latin-1 and "récupération" becomes "rÃ©cupÃ©ration". */
const BOM = '﻿';

const DEFAULT_JSON = fileURLToPath(new URL('../public/data/exercises.json', import.meta.url));
const DEFAULT_CSV = fileURLToPath(new URL('../exercises.csv', import.meta.url));
/** The gate itself — `npm run validate:data` is `node` on exactly this file. */
const VALIDATOR = fileURLToPath(new URL('./validate-data.ts', import.meta.url));

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

// --- Columns, derived from the domain ---

/**
 * How a field survives the trip through a flat cell. `variants` is the one field that is neither
 * scalar nor list — it becomes two columns, one per adaptation direction.
 */
type FieldKind = 'int' | 'text' | 'list' | 'variants';

// The same mapped-type coupling `FIELDS` uses in `validate-data.ts`: adding a field to `Exercise`
// fails `type-check` here until it is given a kind, so a new field can never be silently dropped by
// an export/import round trip — the failure mode this whole file exists to prevent. Declared in
// interface order, which is the order the columns and the written JSON keys come out in.
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

const FIELD_NAMES = Object.keys(FIELD_KINDS) as (keyof Required<Exercise>)[];

// Mapped over `Variants` for the same reason, one level down.
const VARIANT_HEADERS: { [K in keyof Required<Variants>]: string } = {
  harder: 'variants.harder',
  easier: 'variants.easier',
};

const VARIANT_KEYS = Object.keys(VARIANT_HEADERS) as (keyof Required<Variants>)[];

interface Column {
  header: string;
  field: keyof Required<Exercise>;
  kind: FieldKind;
  /** Set only on the two `variants.*` columns. */
  variantKey?: keyof Required<Variants>;
}

const COLUMNS: Column[] = FIELD_NAMES.flatMap((field): Column[] => {
  const kind = FIELD_KINDS[field];
  if (kind !== 'variants') return [{ header: field, field, kind }];
  return VARIANT_KEYS.map((variantKey) => ({
    header: VARIANT_HEADERS[variantKey],
    field,
    kind,
    variantKey,
  }));
});

// --- CSV primitives (RFC 4180) ---

/** Quote when the value would otherwise break the row, or when whitespace would be lost. */
function encodeCell(value: string): string {
  const mustQuote =
    value.includes(DELIMITER) ||
    value.includes('"') ||
    value.includes('\n') ||
    value.includes('\r') ||
    value !== value.trim();
  return mustQuote ? `"${value.replaceAll('"', '""')}"` : value;
}

function encodeRow(cells: readonly string[]): string {
  return cells.map(encodeCell).join(DELIMITER);
}

/**
 * Parse a whole CSV document into rows of raw cells. A hand-rolled state machine rather than a
 * dependency: the grammar is small, and the app ships zero runtime deps — tooling should not be the
 * thing that adds one. Quoted fields may contain `;`, `"` (doubled) and newlines.
 */
function parseCsv(input: string): string[][] {
  const text = input.startsWith(BOM) ? input.slice(1) : input;
  const rows: string[][] = [];
  let row: string[] = [];
  let field = '';
  let quoted = false;

  const endField = (): void => {
    row.push(field);
    field = '';
  };
  const endRow = (): void => {
    endField();
    rows.push(row);
    row = [];
  };

  for (let i = 0; i < text.length; i += 1) {
    const char = text.charAt(i); // charAt, not [i]: `noUncheckedIndexedAccess` widens the latter.

    if (quoted) {
      if (char !== '"') {
        field += char;
      } else if (text.charAt(i + 1) === '"') {
        field += '"';
        i += 1;
      } else {
        quoted = false;
      }
      continue;
    }

    if (char === '"' && field === '') {
      quoted = true;
    } else if (char === DELIMITER) {
      endField();
    } else if (char === '\r') {
      if (text.charAt(i + 1) === '\n') i += 1;
      endRow();
    } else if (char === '\n') {
      endRow();
    } else {
      field += char;
    }
  }

  if (quoted) throw new Error('unterminated quoted field — a `"` is never closed');
  if (field !== '' || row.length > 0) endRow();

  // Trailing blank lines are an editor artefact, not data.
  return rows.filter((cells) => cells.some((cell) => cell.trim() !== ''));
}

// --- JSON → CSV ---

function encodeList(value: unknown): string {
  if (!Array.isArray(value)) return value === undefined ? '' : JSON.stringify(value);
  const items: unknown[] = value;
  return items
    .map((item) => (typeof item === 'string' ? item : JSON.stringify(item)))
    .join(LIST_JOIN);
}

function cellFor(entry: Record<string, unknown>, column: Column): string {
  const value = entry[column.field];
  if (value === undefined) return '';

  switch (column.kind) {
    case 'int':
      return typeof value === 'number' ? String(value) : String(JSON.stringify(value));
    case 'text':
      return typeof value === 'string' ? value : String(JSON.stringify(value));
    case 'list':
      return encodeList(value);
    case 'variants': {
      if (!isPlainObject(value) || column.variantKey === undefined) return '';
      const branch = value[column.variantKey];
      return branch === undefined ? '' : encodeList(branch);
    }
  }
}

function toCsv(entries: readonly unknown[]): string {
  const lines = [encodeRow(COLUMNS.map((column) => column.header))];

  for (const entry of entries) {
    const record = isPlainObject(entry) ? entry : {};
    lines.push(encodeRow(COLUMNS.map((column) => cellFor(record, column))));
  }

  return BOM + lines.join(EOL) + EOL;
}

/** A `|` inside a value would reappear as an extra list item on the way back. Refuse to write it. */
function listSeparatorConflicts(entries: readonly unknown[]): string[] {
  const conflicts: string[] = [];

  entries.forEach((entry, index) => {
    if (!isPlainObject(entry)) return;
    const label = typeof entry['id'] === 'number' ? `#${String(entry['id'])}` : `[${index}]`;

    for (const column of COLUMNS) {
      if (column.kind !== 'list' && column.kind !== 'variants') continue;
      const value = entry[column.field];
      const branch =
        column.variantKey !== undefined && isPlainObject(value) ? value[column.variantKey] : value;
      if (!Array.isArray(branch)) continue;

      const items: unknown[] = branch;
      items.forEach((item, position) => {
        if (typeof item === 'string' && item.includes(LIST_SEPARATOR)) {
          conflicts.push(
            `${label} ${column.header}[${position}] contains "${LIST_SEPARATOR}", the list separator`
          );
        }
      });
    }
  });

  return conflicts;
}

// --- CSV → JSON ---

function parseListCell(raw: string): string[] | undefined {
  const items = raw
    .split(LIST_SEPARATOR)
    .map((item) => item.trim())
    .filter((item) => item !== '');
  return items.length > 0 ? items : undefined;
}

/**
 * Numbers come back as numbers when they look like one, and as the raw string when they do not —
 * so `level;abc` reaches the contract as `level must be 1 | 2 | 3 (got "abc")` rather than as a
 * silent `NaN`. Making bad input *legible* is the point; rejecting it is the contract's job.
 */
function parseNumberCell(raw: string): number | string | undefined {
  const trimmed = raw.trim();
  if (trimmed === '') return undefined;
  if (!/^-?\d+(?:[.,]\d+)?$/.test(trimmed)) return trimmed;
  return Number(trimmed.replace(',', '.'));
}

/** An empty cell means the field is absent, never `""` — optional is load-bearing (§5.6). */
function entryFromRow(
  cells: readonly string[],
  index: Record<string, number>
): Record<string, unknown> {
  const entry: Record<string, unknown> = {};
  const variants: Record<string, unknown> = {};

  for (const column of COLUMNS) {
    const position = index[column.header];
    const raw = position === undefined ? '' : (cells[position] ?? '');

    switch (column.kind) {
      case 'int': {
        const value = parseNumberCell(raw);
        if (value !== undefined) entry[column.field] = value;
        break;
      }
      case 'text': {
        const value = raw.trim();
        if (value !== '') entry[column.field] = value;
        break;
      }
      case 'list': {
        const value = parseListCell(raw);
        if (value !== undefined) entry[column.field] = value;
        break;
      }
      case 'variants': {
        if (column.variantKey === undefined) break;
        const value = parseListCell(raw);
        if (value !== undefined) variants[column.variantKey] = value;
        break;
      }
    }
  }

  // Absent, not `{}` — the contract rejects an empty object, and rightly so.
  if (Object.keys(variants).length > 0) entry['variants'] = variants;

  // Keys land in interface order regardless of the column order in the file, so a round trip is a
  // no-op on the JSON diff even when a coach has dragged columns around in the spreadsheet.
  return Object.fromEntries(
    FIELD_NAMES.filter((field) => entry[field] !== undefined).map((field) => [field, entry[field]])
  );
}

interface CsvParseResult {
  entries: Record<string, unknown>[];
  /** Structural problems (header, row width) — reported before the contract even runs. */
  errors: string[];
}

function fromCsv(text: string): CsvParseResult {
  const errors: string[] = [];
  const rows = parseCsv(text);
  const header = rows[0];

  if (header === undefined) return { entries: [], errors: ['the file is empty — no header row'] };

  const headers = header.map((cell) => cell.trim());
  const known = new Set(COLUMNS.map((column) => column.header));

  const unknown = headers.filter((name) => !known.has(name));
  if (unknown.length > 0) errors.push(`unknown column(s): ${unknown.join(', ')}`);

  const missing = COLUMNS.map((column) => column.header).filter((name) => !headers.includes(name));
  // Every column is required in the header even when its field is optional: a column dropped from
  // the file would silently erase that field for all 115 exercises, which is exactly the kind of
  // quiet data loss a spreadsheet round trip invites.
  if (missing.length > 0) errors.push(`missing column(s): ${missing.join(', ')}`);

  const index: Record<string, number> = {};
  headers.forEach((name, position) => {
    if (index[name] === undefined) index[name] = position;
    else errors.push(`duplicate column "${name}"`);
  });

  const entries = rows.slice(1).map((cells, offset) => {
    if (cells.length !== headers.length) {
      errors.push(
        `line ${offset + 2} has ${cells.length} cells, expected ${headers.length} — a stray ${DELIMITER}, or a quote left open`
      );
    }
    return entryFromRow(cells, index);
  });

  return { entries, errors };
}

// --- CLI ---

function fail(message: string): never {
  console.error(`✖ ${message}`);
  process.exit(1);
}

function readOption(name: string, fallback: string): string {
  const flag = `--${name}`;
  const position = process.argv.indexOf(flag);
  if (position === -1) return fallback;
  const value = process.argv[position + 1];
  if (value === undefined || value.startsWith('--')) fail(`${flag} needs a path`);
  return value;
}

const argv = process.argv.slice(2);
const command = argv.find((argument) => !argument.startsWith('--')) ?? 'help';
const verbose = argv.includes('--verbose');
const dryRun = argv.includes('--dry-run');

function readJson(path: string): unknown {
  try {
    return JSON.parse(readFileSync(path, 'utf8'));
  } catch (error) {
    fail(`${path} is unreadable or not valid JSON: ${(error as Error).message}`);
  }
}

function readText(path: string): string {
  try {
    return readFileSync(path, 'utf8');
  } catch (error) {
    fail(`${path} is unreadable: ${(error as Error).message}`);
  }
}

/**
 * The gate: `npm run validate:data`, on a given file, in its own process. `stdio: 'inherit'` so the
 * coach reads the validator's own words ("#12 level must be 1 | 2 | 3") rather than a paraphrase.
 */
function validateFile(path: string): boolean {
  const args = [VALIDATOR, path, ...(verbose ? ['--verbose'] : [])];
  const result = spawnSync(process.execPath, args, { stdio: 'inherit' });
  if (result.error) fail(`could not run ${VALIDATOR}: ${result.error.message}`);
  return result.status === 0;
}

/** Same gate, plus the parsed payload — for the two legs that start from a JSON file on disk. */
function requireValidFile(path: string): unknown[] {
  if (!validateFile(path)) fail(`${path} did not pass validate:data — nothing written.`);
  const parsed = readJson(path);
  return Array.isArray(parsed) ? (parsed as unknown[]) : [];
}

function runExport(): void {
  const source = readOption('in', DEFAULT_JSON);
  const target = readOption('out', DEFAULT_CSV);

  const entries = requireValidFile(source);

  const conflicts = listSeparatorConflicts(entries);
  if (conflicts.length > 0) {
    for (const conflict of conflicts) console.error(`✖ ${conflict}`);
    fail('the CSV would not survive the trip back — nothing written.');
  }

  writeFileSync(target, toCsv(entries), 'utf8');
  console.log(
    `→ ${String(entries.length)} exercises exported to ${target} (separator "${DELIMITER}", UTF-8 BOM).`
  );
}

function runImport(): void {
  const source = readOption('in', DEFAULT_CSV);
  const target = readOption('out', DEFAULT_JSON);

  let parsed: CsvParseResult;
  try {
    parsed = fromCsv(readText(source));
  } catch (error) {
    fail(`${source} is not readable as CSV: ${(error as Error).message}`);
  }

  if (parsed.errors.length > 0) {
    for (const error of parsed.errors) console.error(`✖ ${error}`);
    fail(`${source} is malformed — nothing written.`);
  }

  // Staged beside the target rather than in a temp dir, for two reasons: the validator is a separate
  // process and so needs a real file to read, and the rename that follows is only atomic within one
  // filesystem. Together they are what lets a rejected CSV leave `exercises.json` byte-for-byte
  // untouched — no half-written window, no roll-back to get wrong.
  const staging = `${target}.staging-${String(process.pid)}`;
  writeFileSync(staging, `${JSON.stringify(parsed.entries, null, 2)}\n`, 'utf8');

  if (!validateFile(staging)) {
    rmSync(staging, { force: true });
    fail(`${source} violates the data contract — ${target} left untouched.`);
  }

  if (dryRun) {
    rmSync(staging, { force: true });
    console.log(
      `→ --dry-run: ${String(parsed.entries.length)} exercises are valid, ${target} left untouched.`
    );
    return;
  }

  renameSync(staging, target);
  console.log(`→ ${String(parsed.entries.length)} exercises written to ${target}.`);
}

/**
 * Fidelity proof: encode the live catalogue, decode it straight back, and diff. The repo has no test
 * runner, so this is the check that keeps "it exported fine" from meaning "it exported lossily".
 */
function runVerify(): void {
  const source = readOption('in', DEFAULT_JSON);
  const entries = requireValidFile(source);

  const conflicts = listSeparatorConflicts(entries);
  for (const conflict of conflicts) console.error(`✖ ${conflict}`);

  const decoded = fromCsv(toCsv(entries));
  for (const error of decoded.errors) console.error(`✖ round trip: ${error}`);

  // Compare against the *normalised* source (keys in interface order), so a key-order difference in
  // the hand-authored file is not reported as data loss — it isn't one.
  const normalise = (entry: unknown): string =>
    JSON.stringify(
      isPlainObject(entry)
        ? Object.fromEntries(
            FIELD_NAMES.filter((field) => entry[field] !== undefined).map((field) => [
              field,
              entry[field],
            ])
          )
        : entry
    );

  const drift: string[] = [];
  const longest = Math.max(entries.length, decoded.entries.length);
  for (let i = 0; i < longest; i += 1) {
    const before = normalise(entries[i]);
    const after = normalise(decoded.entries[i]);
    if (before !== after) drift.push(`[${i}]\n  before: ${before}\n  after:  ${after}`);
  }

  const shown = verbose ? drift : drift.slice(0, 3);
  for (const difference of shown) console.error(`✖ ${difference}`);
  if (drift.length > shown.length) {
    console.error(`✖ … and ${drift.length - shown.length} more (--verbose to list them all)`);
  }

  if (drift.length > 0 || conflicts.length > 0 || decoded.errors.length > 0) {
    fail(`round trip is lossy on ${String(drift.length)} of ${String(entries.length)} exercises.`);
  }
  console.log(`→ round trip is lossless on all ${String(entries.length)} exercises.`);
}

switch (command) {
  case 'export':
    runExport();
    break;
  case 'import':
    runImport();
    break;
  case 'verify':
    runVerify();
    break;
  default:
    console.log(
      [
        'Usage: node scripts/exercises-csv.ts <export|import|verify> [options]',
        '',
        `  export   JSON → CSV   --in ${DEFAULT_JSON}`,
        `                        --out ${DEFAULT_CSV}`,
        `  import   CSV → JSON   --in ${DEFAULT_CSV}`,
        `                        --out ${DEFAULT_JSON}`,
        '                        --dry-run   validate only, write nothing',
        '  verify   JSON → CSV → JSON in memory, diffed (fidelity proof)',
        '',
        '  --verbose   list every warning / difference instead of the first few',
        '',
        `CSV dialect: "${DELIMITER}" separator, RFC 4180 quoting, CRLF, UTF-8 BOM,`,
        `list cells separated by " ${LIST_SEPARATOR} ".`,
      ].join('\n')
    );
    if (command !== 'help') process.exit(1);
}

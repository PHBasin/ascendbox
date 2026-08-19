// scripts/exercises-csv.ts — JSON ⇄ CSV for the catalogue. Tooling only, never shipped.
//
// Why it exists: `public/data/exercises.json` is hand-authored, and the people who author it are
// coaches, not developers. A spreadsheet is the tool they already have.
//
//   npm run data:export -- [--out fichier.csv]   JSON → CSV
//   npm run data:import -- [--in fichier.csv]    CSV → JSON
//
// It converts, and nothing else. Checking the *content* is `npm run validate:data` — the existing
// gate, unchanged and unwrapped — run after an import. Two commands, one job each, rather than one
// command with an opinion about when the other should fire.
//
// The refusals below are all about the *conversion* being faithful, never about the data being good:
// a `|` inside a value, a header that does not match the columns, a file with no data row. Each one
// is a silent corruption if it goes through.
//
// The one thing kept in its own file is `lib/exercise-csv.ts`, the Exercise ⇄ CSV mapping: it is pure
// — no I/O, no `process`, no `console` — which is what makes it unit-testable the day a runner lands.
// Everything with a side effect lives here, because running a command *is* the side effect.
//
// Messages are English like the rest of the tooling; French is for catalogue content only.

import { readFileSync, writeFileSync } from 'node:fs';
import process from 'node:process';
import { fileURLToPath } from 'node:url';
import { parseArgs } from 'node:util';

import {
  CSV_DELIMITER,
  decodeExercises,
  encodeExercises,
  findListSeparatorConflicts,
} from './lib/exercise-csv.ts';

const CATALOGUE_PATH = fileURLToPath(new URL('../public/data/exercises.json', import.meta.url));
const DEFAULT_CSV_PATH = fileURLToPath(new URL('../exercises.csv', import.meta.url));

const USAGE = `Usage: node scripts/exercises-csv.ts <export|import> [--in <path>] [--out <path>]

  export   JSON → CSV   --in ${CATALOGUE_PATH}
                        --out ${DEFAULT_CSV_PATH}
  import   CSV → JSON   --in ${DEFAULT_CSV_PATH}
                        --out ${CATALOGUE_PATH}

Converting is all this does. Run \`npm run validate:data\` after an import to check the content.
CSV dialect: "${CSV_DELIMITER}" separator, RFC 4180 quoting, CRLF, UTF-8 BOM; list cells " | "-separated.`;

// --- Files ---

function readTextFile(path: string): string {
  try {
    return readFileSync(path, 'utf8');
  } catch (error) {
    throw new Error(`${path} is unreadable: ${(error as Error).message}`, { cause: error });
  }
}

function writeTextFile(path: string, contents: string): void {
  try {
    writeFileSync(path, contents, 'utf8');
  } catch (error) {
    throw new Error(`${path} could not be written: ${(error as Error).message}`, { cause: error });
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

function readCommand(): { run: (options: Options) => void; options: Options } {
  // `parseArgs` is native and rejects an unknown flag, so a typo is an error rather than a silent
  // fallback to the default path — the failure mode a hand-rolled argv scan invites.
  const { values, positionals } = parseArgs({
    options: { in: { type: 'string' }, out: { type: 'string' } },
    allowPositionals: true,
  });

  const [command] = positionals;
  const run = command === undefined ? undefined : COMMANDS[command];
  if (run === undefined) {
    throw new Error(
      `${command === undefined ? 'no command given' : `unknown command "${command}"`}\n\n${USAGE}`
    );
  }

  return { run, options: { source: values.in, target: values.out } };
}

try {
  const { run, options } = readCommand();
  run(options);
} catch (error) {
  console.error(`✖ ${(error as Error).message}`);
  process.exit(1);
}

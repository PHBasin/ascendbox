// scripts/exercises-csv.ts — the CLI over the CSV round trip. Tooling only, never shipped.
//
// Why it exists: `public/data/exercises.json` is hand-authored, and the people who author it are
// coaches, not developers. A spreadsheet is the tool they already have — and also the easiest way to
// quietly break a contract nothing re-checks.
//
//   npm run data:export -- [--out fichier.csv]   JSON → CSV
//   npm run data:import -- [--in fichier.csv]    CSV → JSON, written only if it passes the contract
//                                                 (--dry-run stops at the verdict)
//
// This file only orchestrates: `lib/exercise-csv.ts` holds the mapping (pure), `lib/catalogue-store.ts`
// every file and process touch. Validation is neither restated nor refactored here — the store spawns
// `scripts/validate-data.ts`, the same gate `npm run validate:data` runs.
//
// Messages are English like the rest of the tooling; French is for catalogue content only.

import process from 'node:process';
import { parseArgs } from 'node:util';

import {
  CATALOGUE_PATH,
  DEFAULT_CSV_PATH,
  passesDataContract,
  readJsonArray,
  readTextFile,
  writeCatalogueIfValid,
  writeTextFile,
} from './lib/catalogue-store.ts';
import {
  CSV_DELIMITER,
  decodeExercises,
  encodeExercises,
  findListSeparatorConflicts,
} from './lib/exercise-csv.ts';

const USAGE = `Usage: node scripts/exercises-csv.ts <export|import> [options]

  export   JSON → CSV      --in ${CATALOGUE_PATH}
                           --out ${DEFAULT_CSV_PATH}
  import   CSV → JSON      --in ${DEFAULT_CSV_PATH}
                           --out ${CATALOGUE_PATH}
                           --dry-run   validate only, write nothing

  --verbose   list every warning and every issue instead of the first few

CSV dialect: "${CSV_DELIMITER}" separator, RFC 4180 quoting, CRLF, UTF-8 BOM; list cells " | "-separated.`;

interface Options {
  source?: string | undefined;
  target?: string | undefined;
  verbose: boolean;
  dryRun: boolean;
}

/** Reported one at a time, capped unless `--verbose`, so a stray column does not bury the verdict. */
function report(issues: readonly string[], verbose: boolean, cap = 5): void {
  const shown = verbose ? issues : issues.slice(0, cap);
  for (const issue of shown) console.error(`✖ ${issue}`);
  if (issues.length > shown.length) {
    console.error(
      `✖ … and ${String(issues.length - shown.length)} more (--verbose to list them all)`
    );
  }
}

function runExport({ source = CATALOGUE_PATH, target = DEFAULT_CSV_PATH, verbose }: Options): void {
  if (!passesDataContract(source, verbose)) {
    throw new Error(`${source} did not pass validate:data — nothing written.`);
  }

  const entries = readJsonArray(source);

  const conflicts = findListSeparatorConflicts(entries);
  if (conflicts.length > 0) {
    report(conflicts, verbose);
    throw new Error('the CSV would not survive the trip back — nothing written.');
  }

  writeTextFile(target, encodeExercises(entries));
  console.log(
    `→ ${String(entries.length)} exercises exported to ${target} (separator "${CSV_DELIMITER}", UTF-8 BOM).`
  );
}

function runImport({
  source = DEFAULT_CSV_PATH,
  target = CATALOGUE_PATH,
  verbose,
  dryRun,
}: Options): void {
  const { entries, errors } = decodeExercises(readTextFile(source));
  if (errors.length > 0) {
    report(errors, verbose);
    throw new Error(`${source} is malformed — nothing written.`);
  }

  if (!writeCatalogueIfValid(target, entries, { verbose, dryRun })) {
    throw new Error(`${source} did not pass validate:data — ${target} left untouched.`);
  }

  const count = String(entries.length);
  console.log(
    dryRun
      ? `→ --dry-run: ${count} exercises are valid, ${target} left untouched.`
      : `→ ${count} exercises written to ${target}.`
  );
}

const COMMANDS: Record<string, (options: Options) => void> = {
  export: runExport,
  import: runImport,
};

function readOptions(): { run: (options: Options) => void; options: Options } {
  // `parseArgs` is native and rejects unknown flags, so a typo is an error rather than a silent
  // default — the failure mode a hand-rolled argv scan invites.
  const { values, positionals } = parseArgs({
    options: {
      in: { type: 'string' },
      out: { type: 'string' },
      'dry-run': { type: 'boolean', default: false },
      verbose: { type: 'boolean', default: false },
    },
    allowPositionals: true,
  });

  const [command] = positionals;
  const run = command === undefined ? undefined : COMMANDS[command];
  if (run === undefined) {
    throw new Error(
      `${command === undefined ? 'no command given' : `unknown command "${command}"`}\n\n${USAGE}`
    );
  }

  return {
    run,
    options: {
      source: values.in,
      target: values.out,
      verbose: values.verbose,
      dryRun: values['dry-run'],
    },
  };
}

try {
  const { run, options } = readOptions();
  run(options);
} catch (error) {
  console.error(`✖ ${(error as Error).message}`);
  process.exit(1);
}

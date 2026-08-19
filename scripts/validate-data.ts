// scripts/validate-data.ts — the CI gate over the hand-authored catalogue. Never shipped.
//
// Thin on purpose: the rules themselves live in `lib/exercise-contract.ts`, because the CSV
// round-trip (`scripts/exercises-csv.ts`) has to apply the very same ones to a payload that is not
// on disk yet. This file is only the file-reading, exit-code half.

import { readFileSync } from 'node:fs';
import process from 'node:process';
import { fileURLToPath } from 'node:url';

import { reportContract, validateExercises } from './lib/exercise-contract.ts';

const DATA_PATH = fileURLToPath(new URL('../public/data/exercises.json', import.meta.url));

function fail(message: string): never {
  console.error(`✖ ${message}`);
  process.exit(1);
}

let parsed: unknown;
try {
  parsed = JSON.parse(readFileSync(DATA_PATH, 'utf8'));
} catch (error) {
  fail(`${DATA_PATH} is unreadable or not valid JSON: ${(error as Error).message}`);
}

const clean = reportContract(validateExercises(parsed), process.argv.includes('--verbose'));
if (!clean) process.exit(1);

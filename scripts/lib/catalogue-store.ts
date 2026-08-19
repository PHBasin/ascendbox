// scripts/lib/catalogue-store.ts — every file and process touch the CSV tooling makes.
//
// The tooling-side sibling of `src/data/exerciseRepository.ts`: the one module that knows where the
// catalogue lives and how it is written, so the codec stays pure and the CLI stays presentation.
// It throws on I/O faults and returns a verdict on contract faults — formatting either into a
// message and an exit code is the CLI's job, not this file's.
//
// Messages are English like the rest of the tooling; French is for catalogue content only.

import { spawnSync } from 'node:child_process';
import { readFileSync, renameSync, rmSync, writeFileSync } from 'node:fs';
import process from 'node:process';
import { fileURLToPath } from 'node:url';

export const CATALOGUE_PATH = fileURLToPath(
  new URL('../../public/data/exercises.json', import.meta.url)
);
export const DEFAULT_CSV_PATH = fileURLToPath(new URL('../../exercises.csv', import.meta.url));

/** The CI gate itself: `npm run validate:data` is `node` on exactly this file. */
const VALIDATOR_PATH = fileURLToPath(new URL('../validate-data.ts', import.meta.url));

export function readTextFile(path: string): string {
  try {
    return readFileSync(path, 'utf8');
  } catch (error) {
    throw new Error(`${path} is unreadable: ${(error as Error).message}`, { cause: error });
  }
}

export function readJsonArray(path: string): unknown[] {
  const parsed: unknown = JSON.parse(readTextFile(path));
  if (!Array.isArray(parsed)) throw new Error(`${path} must contain a bare array of exercises`);
  return parsed as unknown[];
}

export function writeTextFile(path: string, contents: string): void {
  try {
    writeFileSync(path, contents, 'utf8');
  } catch (error) {
    throw new Error(`${path} could not be written: ${(error as Error).message}`, { cause: error });
  }
}

/**
 * Runs the data contract over a file — the real `scripts/validate-data.ts`, in its own process,
 * rather than a second transcription of its rules. `stdio: 'inherit'` so the coach reads the
 * validator's own words ("#12 level must be 1 | 2 | 3") instead of a paraphrase.
 */
export function passesDataContract(path: string, verbose = false): boolean {
  const args = [VALIDATOR_PATH, path, ...(verbose ? ['--verbose'] : [])];
  const result = spawnSync(process.execPath, args, { stdio: 'inherit' });

  if (result.error) throw new Error(`could not run ${VALIDATOR_PATH}: ${result.error.message}`);
  return result.status === 0;
}

function serialise(entries: readonly unknown[]): string {
  return `${JSON.stringify(entries, null, 2)}\n`;
}

/**
 * Writes the catalogue only if it passes the contract, and reports whether it did.
 *
 * The candidate is staged beside its target — the validator is a separate process and needs a real
 * file to read, and `rename` is atomic only within one filesystem. Together that is what lets a
 * rejected import leave the target byte-for-byte untouched: no half-written window, no roll-back to
 * get wrong. `dryRun` runs the whole check and keeps nothing.
 */
export function writeCatalogueIfValid(
  path: string,
  entries: readonly unknown[],
  { verbose = false, dryRun = false } = {}
): boolean {
  const staging = `${path}.staging-${String(process.pid)}`;

  try {
    writeTextFile(staging, serialise(entries));
    const valid = passesDataContract(staging, verbose);
    if (valid && !dryRun) renameSync(staging, path);
    return valid;
  } finally {
    // Harmless when the rename already moved it; the point is that no crash path leaves one behind.
    rmSync(staging, { force: true });
  }
}

// src/data/exerciseRepository.ts
// Data layer: the only module that knows the source (static /public JSON today, API tomorrow).
import { isCategoryId, isLevel } from '@/domain/exercise';
import type { Exercise } from '@/domain/exercise';

/**
 * Why the load failed, as a value rather than a sentence. The data layer is infrastructure: it knows
 * *what* went wrong, not what a coach should read about it. The French copy lives one layer up, in
 * `useCatalogue` - which is also the only layer that knows the app speaks French.
 */
export type CatalogueErrorKind = 'network' | 'timeout' | 'http' | 'malformed';

export class CatalogueError extends Error {
  readonly kind: CatalogueErrorKind;

  constructor(kind: CatalogueErrorKind, message: string, options?: ErrorOptions) {
    super(message, options);
    this.name = 'CatalogueError';
    this.kind = kind;
  }
}

// `BASE_URL`, not a leading slash: Vite rewrites it per deploy target, so a move to project-pages
// (github.io/ascendbox/, the migration vite.config.ts documents) does not silently 404 here.
const DATA_URL = `${import.meta.env.BASE_URL}data/exercises.json`;

// A hung request is the failure mode with no natural end: without this the skeleton stays on screen
// forever instead of reaching the error branch, which is the one that offers a way out.
const TIMEOUT_MS = 10_000;

let cache: Exercise[] | null = null;
// The *promise*, not just the result: the cache used to be written only after the await, so two
// overlapping calls both saw `null` and both fetched. Concurrency safety belonged here, not in the
// consumer that happened to hold a `started` flag.
let inFlight: Promise<Exercise[]> | null = null;

/**
 * Minimal structural check, deliberately not a second `validate:data`.
 *
 * Its job is the failures a *deploy* produces - a truncated body, or the SPA fallback handing back
 * `index.html` - not editorial ones, which CI already refuses before the file ships. So it rejects
 * the payload wholesale when the shape is wrong, and drops individual malformed entries rather than
 * denying a coach the other 122 exercises over one bad record.
 */
function isUsable(value: unknown): value is Exercise {
  if (typeof value !== 'object' || value === null) return false;
  const entry = value as Record<string, unknown>;
  return (
    typeof entry['id'] === 'number' &&
    typeof entry['title'] === 'string' &&
    typeof entry['teaser'] === 'string' &&
    isCategoryId(entry['categoryId']) &&
    isLevel(entry['level']) &&
    typeof entry['duration'] === 'number' &&
    Array.isArray(entry['tags'])
  );
}

async function requestCatalogue(): Promise<Exercise[]> {
  const controller = new AbortController();
  const timer = setTimeout(() => {
    controller.abort();
  }, TIMEOUT_MS);

  let response: Response;
  try {
    response = await fetch(DATA_URL, { signal: controller.signal });
  } catch (cause) {
    const aborted = cause instanceof Error && cause.name === 'AbortError';
    throw new CatalogueError(
      aborted ? 'timeout' : 'network',
      aborted ? `${DATA_URL} timed out after ${TIMEOUT_MS}ms` : `${DATA_URL} is unreachable`,
      { cause }
    );
  } finally {
    clearTimeout(timer);
  }

  if (!response.ok) {
    throw new CatalogueError('http', `${DATA_URL} returned ${String(response.status)}`);
  }

  let payload: unknown;
  try {
    payload = await response.json();
  } catch (cause) {
    // The realistic case, and the reason this branch exists: the offline fallback served index.html
    // where JSON was expected. Left uncaught it surfaced a raw English SyntaxError to the coach.
    throw new CatalogueError('malformed', `${DATA_URL} is not valid JSON`, { cause });
  }

  if (!Array.isArray(payload)) {
    throw new CatalogueError('malformed', `${DATA_URL} must contain a bare array of exercises`);
  }

  const entries: unknown[] = payload;
  const usable = entries.filter(isUsable);
  if (usable.length < entries.length) {
    console.warn(
      `[catalogue] ${String(entries.length - usable.length)} malformed exercise(s) dropped - run \`npm run validate:data\``
    );
  }
  // An empty catalogue is indistinguishable from an empty *category* once it reaches the feed, which
  // would render a data outage as a normal "nothing here". Refuse it as the outage it is.
  if (usable.length === 0) {
    throw new CatalogueError('malformed', `${DATA_URL} holds no usable exercise`);
  }

  // Frozen at both levels the app ever reads: the list and each entry. That is what guarantees Vue
  // never proxies them (the nested `tags` / `instructions` arrays stay plain, and are never written).
  for (const entry of usable) Object.freeze(entry);
  return Object.freeze(usable) as Exercise[];
}

export async function getAllExercises(): Promise<Exercise[]> {
  if (cache) return cache;

  // A rejected load is never cached: `inFlight` is cleared either way, so a retry re-requests rather
  // than replaying the failure it is trying to escape.
  inFlight ??= requestCatalogue()
    .then((list) => {
      cache = list;
      return list;
    })
    .finally(() => {
      inFlight = null;
    });

  return inFlight;
}

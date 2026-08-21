// src/application/useCatalogue.ts
// The catalogue itself: one request per app lifetime, its two failure surfaces, and the id index.
// State hoisted to module scope → shared singleton.
import { computed, ref, shallowRef } from 'vue';
import { CatalogueError, getAllExercises } from '@/data/exerciseRepository';
import type { CatalogueErrorKind } from '@/data/exerciseRepository';
import type { Exercise } from '@/domain/exercise';

// The one place that knows both what went wrong and that the app speaks French. The repository
// raises a `kind`; the sentence is chosen here, so a coach never reads `SyntaxError` or an HTTP code.
const MESSAGES: Record<CatalogueErrorKind, string> = {
  network: 'Impossible de charger les exercices. Vérifiez votre connexion.',
  timeout: 'Le chargement a pris trop de temps. Réessayez.',
  http: 'Les exercices sont introuvables sur le serveur.',
  malformed: 'Les exercices n’ont pas pu être lus.',
};
const FALLBACK = 'Impossible de charger les exercices.';

function messageFor(cause: unknown): string {
  // Never `(cause as Error).message`: a non-Error throw used to render the literal text "undefined".
  console.error('[catalogue]', cause);
  return cause instanceof CatalogueError ? MESSAGES[cause.kind] : FALLBACK;
}

// shallowRef: the list is replaced wholesale, never deep-mutated (no proxy over the 123 objects).
const all = shallowRef<Exercise[]>([]);
const isLoading = ref(true);
const error = ref<string | null>(null);

/** id → exercise, so the detail route resolves in O(1) instead of scanning the whole catalogue. */
const byId = computed(() => new Map(all.value.map((exercise) => [exercise.id, exercise])));

let pending: Promise<void> | null = null;
let attempted = false;

async function run(): Promise<void> {
  isLoading.value = true;
  error.value = null;
  try {
    all.value = await getAllExercises();
  } catch (cause) {
    error.value = messageFor(cause);
  } finally {
    isLoading.value = false;
    pending = null;
  }
}

function start(): void {
  pending ??= run();
}

/**
 * Fire-and-forget on first use. Guarded by `attempted` rather than by "did it succeed": every
 * component that mounts calls this, so a failed load must not turn each remount into another request.
 * Recovering is `retry`'s job, and it is a deliberate tap.
 */
export function loadCatalogue(): void {
  if (!attempted) {
    attempted = true;
    start();
  }
}

/**
 * The way out of a failed load - the one thing the old store could not do. `started` used to be set
 * *before* the await and never cleared on failure, so a single transient network error pinned the
 * app to its error state for the rest of its lifetime. Outdoors, on mobile data, that is the norm.
 */
export function retryCatalogue(): void {
  start();
}

export function useCatalogue() {
  return { all, byId, isLoading, error, retry: retryCatalogue };
}

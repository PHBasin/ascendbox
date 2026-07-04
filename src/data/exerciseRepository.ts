// src/data/exerciseRepository.ts
// Data-access layer: the only module that knows the source. Today a static
// file served from /public (out of the JS bundle → better TTI), tomorrow an API.
import type { Exercise } from '@/domain/exercise';

let cache: Exercise[] | null = null; // loaded only once

export async function getAllExercises(): Promise<Exercise[]> {
  if (cache) return cache;

  const res = await fetch('/data/exercises.json');
  if (!res.ok) throw new Error(`Loading exercises: ${res.status}`);

  const raw = (await res.json()) as Exercise[];
  // Object.freeze: immutable + guarantees Vue will never try to make it reactive.
  cache = Object.freeze(raw) as Exercise[];
  return cache;
}

// src/domain/exercise.ts
// Domain: pure business entities & types (no framework/data dependency).

// Single source of truth for the piliers: { technical id (JSON) → displayed label }.
export const CATEGORIES = [
  { id: 'physique', label: 'Physique' },
  { id: 'technique', label: 'Technique' },
  { id: 'mental', label: 'Mental' },
] as const;

export type CategoryId = (typeof CATEGORIES)[number]['id'];
export type Level = 1 | 2 | 3; // 1 = low, 2 = moderate, 3 = high

export interface Exercise {
  id: number;
  title: string;
  description: string;
  categoryId: CategoryId;
  tags: string[];
  level: Level;
  duration: number; // minutes
}

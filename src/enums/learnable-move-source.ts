import type { ObjectValues } from "#types/type-helpers";

/**
 * Shows the source a move can be learned from. Used to contextualize/color relearn moves. \
 * Fusion sources are offset by +1 from their base counterpart.
 */
export const LearnableMoveSource = {
  LEVEL: 0,
  RELEARN: 2,
  EVOLUTION: 4,
  PREVO: 6,
  TM: 8,
  EGG: 10,
  OTHER: 12,
} as const;

export type LearnableMoveSource = ObjectValues<typeof LearnableMoveSource>;

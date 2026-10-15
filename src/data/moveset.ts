import type { MovePool } from "#data/characters/types/character-types-objects";
import { MoveId } from "#enums/move-id";

export type MoveSet = [MoveId, MoveId, MoveId, MoveId];

export function toMovePool(ids: MoveId[]): MovePool {
  return [
    ids[0] || MoveId.NONE,
    ids[1] || MoveId.NONE,
    ids[2] || MoveId.NONE,
    ids[3] || MoveId.NONE,
    ids[4] || MoveId.NONE,
    ids[5] || MoveId.NONE,
    ids[6] || MoveId.NONE,
    ids[7] || MoveId.NONE,
  ];
}

export function toMoveSet(ids: MoveId[]): MoveSet {
  return [ids[0] || MoveId.NONE, ids[1] || MoveId.NONE, ids[2] || MoveId.NONE, ids[3] || MoveId.NONE];
}

export const blankMovePool: MovePool = [
  MoveId.NONE,
  MoveId.NONE,
  MoveId.NONE,
  MoveId.NONE,
  MoveId.NONE,
  MoveId.NONE,
  MoveId.NONE,
  MoveId.NONE,
];
export const blankMoveSet: MoveSet = [MoveId.NONE, MoveId.NONE, MoveId.NONE, MoveId.NONE];

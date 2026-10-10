import { MoveId } from "#enums/move-id";
import { PokemonMove } from "#moves/pokemon-move";

export type MovePool = [MoveId, MoveId, MoveId, MoveId, MoveId, MoveId, MoveId, MoveId];
export type MoveSet = [MoveId, MoveId, MoveId, MoveId];
export type CurrentMoves = [PokemonMove, PokemonMove, PokemonMove, PokemonMove];

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

export function toCurrentMoves(ids: PokemonMove[]): CurrentMoves {
  return [
    ids[0] || PokemonMove.blankMove,
    ids[1] || PokemonMove.blankMove,
    ids[2] || PokemonMove.blankMove,
    ids[3] || PokemonMove.blankMove,
  ];
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
export const blankCurrentMoves: CurrentMoves = [
  PokemonMove.blankMove,
  PokemonMove.blankMove,
  PokemonMove.blankMove,
  PokemonMove.blankMove,
];

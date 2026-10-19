import { MOVE_POOLS } from "#data/characters/data-maps/character-maps-objects";
import { CharacterId } from "#data/characters/types/character-types-enums";
import type { MovePool } from "#data/characters/types/character-types-objects";
import { type CharacterInput, fromCIdSafely } from "#data/characters/utils/character-input";
import { blankMovePool, type MoveSet, toMoveSet } from "#data/moveset";
import { MoveId } from "#enums/move-id";

export function initMovePools() {
  MOVE_POOLS.set(CharacterId.VM_VAPOREON, [
    MoveId.ICE_BEAM,
    MoveId.HYPER_BEAM,
    MoveId.HYDRO_PUMP,
    MoveId.BLIZZARD,
    MoveId.SCALD,
    MoveId.TAUNT,
    MoveId.HAIL,
    MoveId.FLIP_TURN,
  ]);
  MOVE_POOLS.set(CharacterId.VM_MAWILE, [
    MoveId.IRON_DEFENSE,
    MoveId.BATON_PASS,
    MoveId.PROTECT,
    MoveId.IRON_HEAD,
    MoveId.SWORDS_DANCE,
    MoveId.STEALTH_ROCK,
    MoveId.SUBSTITUTE,
    MoveId.CRUNCH,
  ]);

  MOVE_POOLS.set(CharacterId.ES_ESPEON, blankMovePool);
  MOVE_POOLS.set(CharacterId.ES_SPIDOPS, blankMovePool);

  MOVE_POOLS.set(CharacterId.DS_DIA, [
    MoveId.REFLECT,
    MoveId.LIGHT_SCREEN,
    MoveId.PSYCHIC,
    MoveId.TELEPORT,
    MoveId.FUTURE_SIGHT,
    MoveId.NASTY_PLOT,
    MoveId.SUBSTITUTE,
    MoveId.MORNING_SUN,
  ]);
  MOVE_POOLS.set(CharacterId.DS_SILVER, [
    MoveId.CRUNCH,
    MoveId.TAKE_DOWN,
    MoveId.PARTING_SHOT,
    MoveId.MEAN_LOOK,
    MoveId.SWORDS_DANCE,
    MoveId.STEALTH_ROCK,
    MoveId.SUBSTITUTE,
    MoveId.MOONLIGHT,
  ]);
}

export function getMovePoolFromMap(input: CharacterInput): MovePool {
  return fromCIdSafely(input, id => MOVE_POOLS.get(id), blankMovePool);
}

export function getDefaultActiveMoves(input: CharacterInput): MoveSet {
  return toMoveSet(getMovePoolFromMap(input).slice(0, 4));
}

export function getDefaultReserveMoves(input: CharacterInput): MoveSet {
  return toMoveSet(getMovePoolFromMap(input).slice(4, 8));
}

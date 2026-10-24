import { getMovePool } from "#data/characters/constant-data/character-data-arrays";
import { CharacterId } from "#data/characters/types/character-types-enums";
import type { MovePool } from "#data/characters/types/character-types-objects";
import { blankMovePool, type MoveSet, toMoveSet } from "#data/moveset";
import { MoveId } from "#enums/move-id";

export function initMovePools(): MovePool[] {
  const movePools: MovePool[] = [];
  movePools[CharacterId.VM_VAPOREON] = [
    MoveId.ICE_BEAM,
    MoveId.HYPER_BEAM,
    MoveId.HYDRO_PUMP,
    MoveId.BLIZZARD,
    MoveId.SCALD,
    MoveId.TAUNT,
    MoveId.HAIL,
    MoveId.FLIP_TURN,
  ];
  movePools[CharacterId.VM_MAWILE] = [
    MoveId.IRON_DEFENSE,
    MoveId.BATON_PASS,
    MoveId.PROTECT,
    MoveId.IRON_HEAD,
    MoveId.SWORDS_DANCE,
    MoveId.STEALTH_ROCK,
    MoveId.SUBSTITUTE,
    MoveId.CRUNCH,
  ];

  movePools[CharacterId.ES_ESPEON] = blankMovePool;
  movePools[CharacterId.ES_SPIDOPS] = blankMovePool;

  movePools[CharacterId.DS_DIA] = [
    MoveId.REFLECT,
    MoveId.LIGHT_SCREEN,
    MoveId.PSYCHIC,
    MoveId.TELEPORT,
    MoveId.FUTURE_SIGHT,
    MoveId.NASTY_PLOT,
    MoveId.SUBSTITUTE,
    MoveId.MORNING_SUN,
  ];
  movePools[CharacterId.DS_SILVER] = [
    MoveId.CRUNCH,
    MoveId.TAKE_DOWN,
    MoveId.PARTING_SHOT,
    MoveId.MEAN_LOOK,
    MoveId.SWORDS_DANCE,
    MoveId.STEALTH_ROCK,
    MoveId.SUBSTITUTE,
    MoveId.MOONLIGHT,
  ];

  return movePools;
}

export function getDefaultActiveMoves(id: CharacterId): MoveSet {
  return toMoveSet(getMovePool(id).slice(0, 4));
}

export function getDefaultReserveMoves(id: CharacterId): MoveSet {
  return toMoveSet(getMovePool(id).slice(4, 8));
}

import { getMovePool } from "#balance/characters/constant-data/character-data-arrays";
import { CharacterId } from "#balance/characters/types/character-types-enums";
import type { MovePool } from "#balance/characters/types/character-types-objects";
import { MoveId } from "#enums/move-id";
import type { StarterMoveset } from "#types/save-data";

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

  movePools[CharacterId.ES_ESPEON] = [
    MoveId.NONE,
    MoveId.NONE,
    MoveId.NONE,
    MoveId.NONE,
    MoveId.NONE,
    MoveId.NONE,
    MoveId.NONE,
    MoveId.NONE,
  ];
  movePools[CharacterId.ES_SPIDOPS] = [
    MoveId.NONE,
    MoveId.NONE,
    MoveId.NONE,
    MoveId.NONE,
    MoveId.NONE,
    MoveId.NONE,
    MoveId.NONE,
    MoveId.NONE,
  ];

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

export function getDefaultActiveMoves(id: CharacterId): StarterMoveset {
  return getMovePool(id).slice(0, 4) as StarterMoveset;
}

export function getDefaultReserveMoves(id: CharacterId): StarterMoveset {
  return getMovePool(id).slice(4, 8) as StarterMoveset;
}

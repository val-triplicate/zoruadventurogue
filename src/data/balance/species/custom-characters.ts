import { Gender } from "#data/gender";
import { CharacterId } from "#enums/character-id";
import { MoveId } from "#enums/move-id";
import { Nature } from "#enums/nature";
import { SpeciesId } from "#enums/species-id";
import type { CharacterDataMap, PreferenceDataMap } from "#types/pokemon-species";
import { blankMovePool, CharacterPreference, type MovePool } from "#types/save-data";

function addCharacter(
  map: CharacterDataMap,
  id: CharacterId,
  speciesId: SpeciesId,
  gender?: Gender,
  nature?: Nature,
  name?: string,
) {
  map[id] = {
    id,
    identity: { name, gender, nature },
    speciesId,
    movePool: MOVE_POOLS[id] || blankMovePool,
    abilities: {},
  };
}

const MOVE_POOLS: Map<CharacterId, MovePool> = new Map();
const SIGNATURE_XMS: Map<CharacterId, MoveId> = new Map();

function initMovePools() {
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
  MOVE_POOLS.set(CharacterId.DS_DIA, [
    MoveId.REFLECT,
    MoveId.LIGHT_SCREEN,
    MoveId.TELEPORT,
    MoveId.FUTURE_SIGHT,
    MoveId.PSYCHIC,
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

  SIGNATURE_XMS.set(CharacterId.VM_VAPOREON, MoveId.FREEZE_DRY);
}

export function initCharacters(): CharacterDataMap {
  initMovePools();
  const map: CharacterDataMap = {} as CharacterDataMap;
  addCharacter(map, CharacterId.VM_VAPOREON, SpeciesId.VAPOREON, Gender.FEMALE, Nature.RASH);
  addCharacter(map, CharacterId.VM_MAWILE, SpeciesId.MAWILE, Gender.FEMALE, Nature.CAREFUL);
  addCharacter(map, CharacterId.ES_ESPEON, SpeciesId.ESPEON, Gender.FEMALE, Nature.HASTY);
  addCharacter(map, CharacterId.ES_SPIDOPS, SpeciesId.SPIDOPS, Gender.FEMALE, Nature.SERIOUS);
  addCharacter(map, CharacterId.DS_DIA, SpeciesId.ESPEON, Gender.FEMALE, Nature.SERIOUS, "Dia");
  addCharacter(map, CharacterId.DS_SILVER, SpeciesId.UMBREON, Gender.NONBINARY, Nature.SERIOUS, "Silver");
  return map;
}

export function initPreferences(charIds: CharacterId[]): PreferenceDataMap {
  const map: PreferenceDataMap = {} as PreferenceDataMap;
  for (const id of charIds) {
    map[id] = new CharacterPreference(id);
  }
  return map;
}

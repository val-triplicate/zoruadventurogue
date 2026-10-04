import { Gender } from "#data/gender";
import { CharacterId } from "#enums/character-id";
import { Nature } from "#enums/nature";
import { SpeciesId } from "#enums/species-id";
import type { CharacterDataMap, PreferenceDataMap } from "#types/pokemon-species";
import { blankMovePool, CharacterPreference } from "#types/save-data";

function addTeamMember(
  map: CharacterDataMap,
  teamMemberId: CharacterId,
  speciesId: SpeciesId,
  gender?: Gender,
  nature?: Nature,
  name?: string,
) {
  map[teamMemberId] = {
    id: teamMemberId,
    identity: { name, gender, nature },
    speciesId,
    movePool: blankMovePool,
    abilities: {},
  };
}

export function initCharacters(): CharacterDataMap {
  const map: CharacterDataMap = {} as CharacterDataMap;
  addTeamMember(map, CharacterId.VM_VAPOREON, SpeciesId.VAPOREON, Gender.FEMALE, Nature.RASH);
  addTeamMember(map, CharacterId.VM_MAWILE, SpeciesId.MAWILE, Gender.FEMALE, Nature.CAREFUL);
  addTeamMember(map, CharacterId.ES_ESPEON, SpeciesId.ESPEON, Gender.FEMALE, Nature.HASTY);
  addTeamMember(map, CharacterId.ES_SPIDOPS, SpeciesId.SPIDOPS, Gender.FEMALE, Nature.SERIOUS);
  addTeamMember(map, CharacterId.DS_DIA, SpeciesId.ESPEON, Gender.FEMALE, Nature.SERIOUS, "Dia");
  addTeamMember(map, CharacterId.DS_SILVER, SpeciesId.UMBREON, Gender.NONBINARY, Nature.SERIOUS, "Silver");
  return map;
}

export function initPreferences(charIds: CharacterId[]): PreferenceDataMap {
  const map: PreferenceDataMap = {} as PreferenceDataMap;
  for (const id of charIds) {
    map[id] = new CharacterPreference(id);
  }
  return map;
}

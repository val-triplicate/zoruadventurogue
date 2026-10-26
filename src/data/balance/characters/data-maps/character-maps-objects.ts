import { CHARACTERS, TEAMS } from "#balance/characters/constant-data/character-data-arrays";
import type { CharacterId } from "#balance/characters/types/character-types-enums";
import type { Character, Team } from "#balance/characters/types/character-types-objects";
import { searchArray } from "#balance/characters/utils/character-array-utils";
import type { SpeciesId } from "#enums/species-id";

export function getTeamFromCharacterId(id: CharacterId): Team {
  return searchArray(TEAMS, t => t.leader === id || t.follower === id, `No Team found for Character ID: ${id}`);
}

export function getCharactersFromSpeciesId(id: SpeciesId): Character[] {
  return CHARACTERS.filter(c => c.identity.speciesId === id);
}

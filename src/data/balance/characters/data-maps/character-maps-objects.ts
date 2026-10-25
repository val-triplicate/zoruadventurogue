import { TEAMS } from "#balance/characters/constant-data/character-data-arrays";
import type { CharacterId } from "#balance/characters/types/character-types-enums";
import type { Team } from "#balance/characters/types/character-types-objects";
import { searchArray } from "#balance/characters/utils/character-array-utils";

export function getTeamFromCharacterId(id: CharacterId): Team {
  return searchArray(TEAMS, t => t.leader === id || t.follower === id, `No Team found for Character ID: ${id}`);
}

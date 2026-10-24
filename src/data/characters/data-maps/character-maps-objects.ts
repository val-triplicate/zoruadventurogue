import { TEAMS } from "#data/characters/constant-data/character-data-arrays";
import type { CharacterId } from "#data/characters/types/character-types-enums";
import type { Team } from "#data/characters/types/character-types-objects";
import { searchArray } from "#data/characters/utils/character-array-utils";

export function getTeamFromCharacterId(id: CharacterId): Team {
  return searchArray(TEAMS, t => t.leader === id || t.follower === id, `No Team found for Character ID: ${id}`);
}

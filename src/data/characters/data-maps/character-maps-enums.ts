import { BALANCES, BIOS, MOVE_POOLS } from "#data/characters/data-maps/character-maps-objects";
import type { AuthorId, CharacterId, OriginId, TeamId } from "#data/characters/types/character-types-enums";
import type { CharacterBalance, MovePool } from "#data/characters/types/character-types-objects";
import { getFromMapSafely, getFromMapUnsafely } from "#data/characters/utils/character-map-utils";

export const AUTHORS: Map<OriginId, AuthorId> = new Map();
export const AUTHOR_OVERRIDES: Map<CharacterId, AuthorId> = new Map();
export const ORIGINS: Map<TeamId, OriginId> = new Map();
export const TEAM_MEMBERS: Map<TeamId, [CharacterId, CharacterId]> = new Map();

export function getAuthorIdFromCharacter(characterId: CharacterId, teamId: TeamId): AuthorId {
  const authorOverrideId = getFromMapSafely(characterId, AUTHOR_OVERRIDES);
  return authorOverrideId || getAuthorIdFromTeam(teamId);
}

export function getAuthorIdFromTeam(teamId: TeamId): AuthorId {
  const originId = getOriginIdFromTeam(teamId);
  return getFromMapUnsafely(originId, AUTHORS, "No Author ID found for Origin ID: " + originId);
}

export function getOriginIdFromTeam(teamId: TeamId): OriginId {
  return getFromMapUnsafely(teamId, ORIGINS, "No Origin ID found for Team ID: " + teamId);
}

export function get(id: CharacterId): CharacterBalance {
  return getFromMapUnsafely(id, BALANCES, "No Balance found for Character ID: " + id);
}

export function getMovePool(id: CharacterId): MovePool {
  return getFromMapUnsafely(id, MOVE_POOLS, "No MovePool found for Character ID: " + id);
}

export function getBio(id: CharacterId): string {
  return getFromMapUnsafely(id, BIOS, "No bio found for Character ID: " + id);
}

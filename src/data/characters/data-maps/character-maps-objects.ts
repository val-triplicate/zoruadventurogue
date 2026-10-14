import { initBalances } from "#data/characters/character-balance";
import { type CharacterIdentity, initIdentities } from "#data/characters/character-identities";
import { initMovePools } from "#data/characters/character-move-pools";
import { initBios } from "#data/characters/character-origins";
import type { CharacterId, TeamId } from "#data/characters/types/character-types-enums";
import type { CharacterBalance, MovePool, Team } from "#data/characters/types/character-types-objects";
import { getFromMapUnsafely } from "#data/characters/utils/character-map-utils";
import { initAuthorOverrides, initAuthors, initOrigins, initTeamMembers } from "../constant-data/character-data-enums";
import type { Character } from "../constant-data/character-data-objects";

export const CHARACTERS: Map<CharacterId, Character> = new Map();
export const TEAMS: Map<TeamId, Team> = new Map();

export const IDENTITIES: Map<CharacterId, CharacterIdentity> = new Map();
export const BALANCES: Map<CharacterId, CharacterBalance> = new Map();
export const MOVE_POOLS: Map<CharacterId, MovePool> = new Map();
export const BIOS: Map<CharacterId, string> = new Map();

// Populate enum maps first, as they require no objects.
export function initEnumMaps() {
  initAuthorOverrides();
  initAuthors();
  initOrigins();
  initTeamMembers();
}

export function initObjectMaps() {
  initIdentities();
  initBalances();
  initMovePools();
  initBios();
}

export function getIdentity(id: CharacterId): CharacterIdentity {
  return getFromMapUnsafely(id, IDENTITIES, "No Identity found for Character ID: " + id);
}

export function getBalance(id: CharacterId): CharacterBalance {
  return getFromMapUnsafely(id, BALANCES, "No Balance found for Character ID: " + id);
}

export function getMovePool(id: CharacterId): MovePool {
  return getFromMapUnsafely(id, MOVE_POOLS, "No MovePool found for Character ID: " + id);
}

export function getBio(id: CharacterId): string {
  return getFromMapUnsafely(id, BIOS, "No bio found for Character ID: " + id);
}

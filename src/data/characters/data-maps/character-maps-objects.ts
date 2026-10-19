import { initBalances } from "#data/characters/character-balance";
import { type CharacterIdentity, initIdentities } from "#data/characters/character-identities";
import { initMovePools } from "#data/characters/character-move-pools";
import { initBios } from "#data/characters/character-origins";
import type { AuthorId, CharacterId, TeamId } from "#data/characters/types/character-types-enums";
import type { CharacterBalance, MovePool, Team } from "#data/characters/types/character-types-objects";
import type { CharacterInput } from "#data/characters/utils/character-input";
import { getFromCharacterMapUnsafely } from "#data/characters/utils/character-map-utils";
import {
  initAuthorOverrides,
  initAuthors,
  initStories,
  initStoryAuthors,
  initTeamMembers,
} from "../constant-data/character-data-enums";
import type { Character } from "../constant-data/character-data-objects";

export const CHARACTERS: Map<CharacterId, Character> = new Map();
export const TEAMS: Map<TeamId, Team> = new Map();

export const IDENTITIES: Map<CharacterId, CharacterIdentity> = new Map();
export const BALANCES: Map<CharacterId, CharacterBalance> = new Map();
export const MOVE_POOLS: Map<CharacterId, MovePool> = new Map();
export const BIOS: Map<CharacterId, string> = new Map();
export const AUTHORS: Map<AuthorId, string> = new Map();

// Populate enum maps first, as they require no objects.
export function initEnumMaps() {
  initAuthorOverrides();
  initStoryAuthors();
  initStories();
  initTeamMembers();
}

export function initObjectMaps() {
  initIdentities();
  initBalances();
  initMovePools();
  initBios();
  initAuthors();
}

export function getIdentity(input: CharacterInput): CharacterIdentity {
  return getFromCharacterMapUnsafely(input, IDENTITIES, "Identity");
}

export function getBalance(input: CharacterInput): CharacterBalance {
  return getFromCharacterMapUnsafely(input, BALANCES, "Balance");
}

export function getMovePool(input: CharacterInput): MovePool {
  return getFromCharacterMapUnsafely(input, MOVE_POOLS, "MovePool");
}

export function getBio(input: CharacterInput): string {
  return getFromCharacterMapUnsafely(input, BIOS, "Bio");
}

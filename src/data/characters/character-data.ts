import type { CharacterIdentity } from "#data/characters/character-identities";
import type { MovePool } from "#data/moveset";
import type { CharacterId } from "#enums/character-id";
import type { MoveId } from "#enums/move-id";
import type { OriginId } from "#enums/origin-id";

export const IDENTITIES: Map<CharacterId, CharacterIdentity> = new Map();
export const MOVE_POOLS: Map<CharacterId, MovePool> = new Map();
export const SIGNATURE_XMS: Map<CharacterId, MoveId> = new Map();
export const BIOS: Map<CharacterId, string> = new Map();
export const ORIGINS: Map<CharacterId, OriginId> = new Map();

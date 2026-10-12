import type { CharacterId, TeamId } from "#data/characters/types/character-types-enums";
import type { Team } from "#data/characters/types/character-types-objects";
import type { CharacterState } from "#types/character-state";
import type { TeamSave } from "#types/save-data";
import type { Character } from "../constant-data/character-data-objects";

export type CharacterDataMap = Record<CharacterId, Character>;
export type CharacterStateDataMap = Record<CharacterId, CharacterState>;
export type TeamDataMap = Record<TeamId, Team>;
export type TeamSaveDataMap = Record<TeamId, TeamSave>;

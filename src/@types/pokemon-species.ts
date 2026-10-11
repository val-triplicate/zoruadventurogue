import type { SpeciesFormEvolution } from "#balance/pokemon-evolutions";
import { Character } from "#data/characters/character";
import { getBalance } from "#data/characters/character-balance";
import { getIdentitySafely } from "#data/characters/character-identities";
import { getMovePool } from "#data/characters/character-move-pools";
import type { PokemonSpecies } from "#data/pokemon-species";
import type { AbilityId } from "#enums/ability-id";
import { CharacterId } from "#enums/character-id";
import type { MoveId } from "#enums/move-id";
import type { OriginId } from "#enums/origin-id";
import type { SpeciesId } from "#enums/species-id";
import type { TeamId } from "#enums/team-id";
import type { CharacterState } from "#types/character-state";
import { getEnumValues } from "#utils/enums";
import type { LevelMoves } from "./level-moves";
import type { StarterSpeciesId } from "./starter-species-id";

/**
 * Mapping of formIndex to passive ability for species with multiple passives.
 */
interface PokemonSpeciesPassives {
  [key: number]: AbilityId;
}

export interface SpeciesFormLevelMoves {
  [key: string]: LevelMoves;
}

export interface SpeciesFormTmMoves {
  [key: string]: MoveId[];
}

export interface PokemonSpeciesData {
  species: PokemonSpecies;
  starter: StarterSpeciesId;
  /** The starter cost. Should be omitted for non starters */
  starterCost?: number;
  evolutions: SpeciesFormEvolution[];
  prevolution: SpeciesId | null;
  /** The passive ability of the species or a mapping of its formIndex to a passive ability */
  passives: AbilityId | PokemonSpeciesPassives;
  /** An array of level moves shared across **all** forms */
  levelMoves: LevelMoves;
  /** Form specific level moves. Record of formKey to an array of level moves */
  formLevelMoves?: SpeciesFormLevelMoves;
  /** An array of TM moves shared across **all** forms */
  tms: MoveId[];
  /** Form specific TM moves. Record of `formKey` to an array of TM moves */
  formTms?: SpeciesFormTmMoves;
}

export interface Team {
  id: TeamId;
  name?: string | undefined;
  leader: CharacterId;
  follower: CharacterId;
  origin: OriginId;
}

export type SpeciesDataMap = Record<SpeciesId, PokemonSpeciesData>;
export type CharacterDataMap = Record<CharacterId, Character>;
export type PreferenceDataMap = Record<CharacterId, CharacterState>;
export type TeamDataMap = Record<TeamId, Team>;

/**
 * The `prevolution` field is set on load based on the evolutions of the starter and doesn't need to be configured
 */
export type SpeciesDataMapConfig = Record<SpeciesId, Omit<PokemonSpeciesData, "prevolution">>;

export function initCharacters(): CharacterDataMap {
  const map: CharacterDataMap = {} as CharacterDataMap;
  for (const id of getEnumValues(CharacterId)) {
    map[id] = new Character(id, getIdentitySafely(id), getBalance(id), getMovePool(id));
  }
  return map;
}

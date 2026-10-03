import type { SpeciesFormEvolution } from "#balance/pokemon-evolutions";
import type { Gender } from "#data/gender";
import type { SpeciesFormChange } from "#data/pokemon-forms";
import type { PokemonSpecies } from "#data/pokemon-species";
import type { AbilityId } from "#enums/ability-id";
import type { MoveId } from "#enums/move-id";
import type { Nature } from "#enums/nature";
import type { Origin } from "#enums/origin";
import type { SpeciesId } from "#enums/species-id";
import type { TeamId } from "#enums/team-id";
import type { TeamMemberId } from "#enums/team-member-id";
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
  formChanges?: SpeciesFormChange[];
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

export interface TeamData {
  teamId: TeamId;
  name?: string | undefined;
  leader: TeamMemberId;
  follower: TeamMemberId;
  origin: Origin;
}

export interface TeamMemberData {
  teamMemberId: TeamMemberId;
  shinyAttr?: bigint | undefined;
  name?: string | undefined;
  gender?: Gender | undefined;
  speciesId: SpeciesId;
  nature?: Nature | undefined;
  moves: MoveId[];
  abilities: { first?: AbilityId; second?: AbilityId; hidden?: AbilityId; passive?: AbilityId };
}

export type SpeciesDataMap = Record<SpeciesId, PokemonSpeciesData>;
export type TeamMemberDataMap = Record<TeamMemberId, TeamMemberData>;
export type TeamDataMap = Record<TeamId, TeamData>;

/**
 * The `prevolution` field is set on load based on the evolutions of the starter and doesn't need to be configured
 */
export type SpeciesDataMapConfig = Record<SpeciesId, Omit<PokemonSpeciesData, "prevolution">>;

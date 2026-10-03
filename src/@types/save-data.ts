import type { PokeballCounts } from "#app/battle-scene";
import type { Tutorial } from "#app/tutorial";
import type { Gender } from "#data/gender";
import type { BattleType } from "#enums/battle-type";
import type { GameModes } from "#enums/game-modes";
import type { MoveId } from "#enums/move-id";
import type { MysteryEncounterType } from "#enums/mystery-encounter-type";
import type { Nature } from "#enums/nature";
import type { PlayerGender } from "#enums/player-gender";
import type { PokemonType } from "#enums/pokemon-type";
import type { SpeciesId } from "#enums/species-id";
import type { TeamMemberId } from "#enums/team-member-id";
import type { MysteryEncounterSaveData } from "#mystery-encounters/mystery-encounter-save-data";
import type { Variant } from "#sprites/variant";
import type { ArenaData } from "#system/arena-data";
import type { GameStats } from "#system/game-stats";
import type { ModifierData } from "#system/modifier-data";
import type { PokemonData } from "#system/pokemon-data";
import type { TrainerData } from "#system/trainer-data";
import type { DexData } from "./dex-data";

export type AppliedMigrators = { [key: string]: number };

export interface SystemSaveData {
  trainerId: number;
  secretId: number;
  gender: PlayerGender;
  dexData: DexData;
  starterData: StarterData;
  teamSaveData: TeamSaveData;
  gameStats: GameStats;
  unlocks: Unlocks;
  achvUnlocks: AchvUnlocks;
  gameVersion: string;
  timestamp: number;
  unlockPity: number[];
  appliedMigrators: AppliedMigrators;
}

export interface SessionSaveData {
  seed: string;
  playTime: number;
  gameMode: GameModes;
  party: PokemonData[];
  enemyParty: PokemonData[];
  modifiers: ModifierData[];
  enemyModifiers: ModifierData[];
  arena: ArenaData;
  pokeballCounts: PokeballCounts;
  money: number;
  score: number;
  waveIndex: number;
  // TODO: This enum being inside save data is basically useless, being inferrable from the presence or absence of `trainer` and `mysteryEncounterType`.
  // Remove this later on to reduce save size and improve clarity.
  battleType: Exclude<BattleType, BattleType.CLEAR>;
  // TODO: This being nullable NEEDS to be reflected in the type signature
  trainer: TrainerData;
  gameVersion: string;
  /** The player-chosen name of the run */
  name: string;
  timestamp: number;
  // TODO: Change default value to `undefined` to both save space and ease nullishness checks
  mysteryEncounterType: MysteryEncounterType | -1; // Only defined when current wave is ME,
  // TODO: This can be `undefined` - reflect that in the type signature
  mysteryEncounterSaveData: MysteryEncounterSaveData;
  /**
   * Counts the amount of pokemon fainted in your party during the current arena encounter.
   */
  playerFaints: number;
}

export interface Unlocks {
  [key: number]: boolean;
}

export interface AchvUnlocks {
  [key: string]: number;
}

export type TeamMemberMoveset =
  | [MoveId]
  | [MoveId, MoveId]
  | [MoveId, MoveId, MoveId]
  | [MoveId, MoveId, MoveId, MoveId];

export interface TeamMemberFormMoveData {
  [key: number]: TeamMemberMoveset;
}

export interface TeamMemberMoveData {
  [key: number]: TeamMemberMoveset | TeamMemberFormMoveData;
}

/** The starter's current attributes (such as selected nature, nickname, etc). */
export interface StarterPreferences {
  abilityIndex?: number | undefined;
  favorite?: boolean | undefined;
  female?: boolean | undefined;
  formIndex?: number | undefined;
  nature?: number | undefined;
  nickname?: string | undefined;
  shiny?: boolean | undefined;
  tera?: PokemonType | undefined;
  variant?: Variant | undefined;
}

/** The team member's current attributes (such as selected nature, nickname, etc). */
export interface TeamMemberPreferences {
  abilityIndex?: number | undefined;
  favorite?: boolean | undefined;
  gender?: Gender;
  formIndex?: number | undefined;
  nature?: number | undefined;
  nickname?: string | undefined;
  shiny?: boolean | undefined;
  tera?: PokemonType | undefined;
  variant?: Variant | undefined;
}

export type AllTeamMemberPreferences = Partial<Record<TeamMemberId, TeamMemberPreferences | undefined>>;

export interface DexAttrProps {
  shiny: boolean;
  gender?: Gender | undefined;
  variant: Variant;
  formIndex: number;
}

export interface Starter {
  speciesId: SpeciesId;
  shiny: boolean;
  variant: Variant;
  formIndex: number;
  female?: boolean | undefined;
  abilityIndex: number;
  passive: boolean;
  nature: Nature;
  moveset?: TeamMemberMoveset | undefined;
  pokerus: boolean;
  nickname?: string | undefined;
  teraType?: PokemonType | undefined;
  ivs: number[];
}

// TODO: What type of number does this store?
export type RunHistoryData = Record<number, RunEntry>;

export interface RunEntry {
  entry: SessionSaveData;
  isVictory: boolean;
  /** Automatically set to false at the moment - implementation TBD */
  isFavorite: boolean;
}

export interface StarterDataEntry {
  moveset: TeamMemberMoveset | TeamMemberFormMoveData | null;
  eggMoves: number;
  candyCount: number;
  friendship: number;
  abilityAttr: number;
  passiveAttr: number;
  valueReduction: number;
  classicWinCount: number;
}

export interface TeamSaveDataEntry {
  unlocked: boolean;
  boss1WinCount: number;
  boss2WinCount: number;
  boss3WinCount: number;
}

export interface StarterData {
  [key: number]: StarterDataEntry;
}

export interface TeamSaveData {
  [key: number]: TeamSaveDataEntry;
}

// TODO: Rework into a bitmask
export type TutorialFlags = {
  [key in Tutorial]: boolean;
};

// TODO: Rework into a bitmask
export interface SeenDialogues {
  [key: string]: boolean;
}

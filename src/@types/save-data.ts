import type { Tutorial } from "#app/tutorial";
import type { Gender } from "#data/gender";
import type { BattleType } from "#enums/battle-type";
import type { CharacterId } from "#enums/character-id";
import type { GameModes } from "#enums/game-modes";
import type { MysteryEncounterType } from "#enums/mystery-encounter-type";
import type { PlayerGender } from "#enums/player-gender";
import type { MysteryEncounterSaveData } from "#mystery-encounters/mystery-encounter-save-data";
import type { Variant } from "#sprites/variant";
import type { ArenaData } from "#system/arena-data";
import type { GameStats } from "#system/game-stats";
import type { ModifierData } from "#system/modifier-data";
import type { PokemonData } from "#system/pokemon-data";
import type { TrainerData } from "#system/trainer-data";
import type { CharacterPreference } from "#types/character-preference";

export type AppliedMigrators = { [key: string]: number };

export interface SystemSaveData {
  trainerId: number;
  secretId: number;
  gender: PlayerGender;
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

export type AllPreferences = Record<CharacterId, CharacterPreference>;

export interface IconProps {
  shiny: boolean;
  gender?: Gender | undefined;
  variant: Variant;
  formIndex: number;
}

// TODO: What type of number does this store?
export type RunHistoryData = Record<number, RunEntry>;

export interface RunEntry {
  entry: SessionSaveData;
  isVictory: boolean;
  /** Automatically set to false at the moment - implementation TBD */
  isFavorite: boolean;
}

export interface TeamSaveDataEntry {
  isTeamUnlocked: boolean;
  isAbilityUnlocked: boolean;
  isPassiveUnlocked: boolean;
  runCount: bigint;
  winCount: bigint;
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

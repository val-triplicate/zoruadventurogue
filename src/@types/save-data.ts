import type { PokeballCounts } from "#app/battle-scene";
import { characterRegistry } from "#app/global-character-data-registry";
import type { Tutorial } from "#app/tutorial";
import { Gender } from "#data/gender";
import type { BattleType } from "#enums/battle-type";
import type { CharacterId } from "#enums/character-id";
import type { GameModes } from "#enums/game-modes";
import { MoveId } from "#enums/move-id";
import type { MysteryEncounterType } from "#enums/mystery-encounter-type";
import { Nature } from "#enums/nature";
import type { PlayerGender } from "#enums/player-gender";
import type { PokemonType } from "#enums/pokemon-type";
import type { SpeciesId } from "#enums/species-id";
import { PokemonMove } from "#moves/pokemon-move";
import type { MysteryEncounterSaveData } from "#mystery-encounters/mystery-encounter-save-data";
import type { Variant } from "#sprites/variant";
import type { ArenaData } from "#system/arena-data";
import type { GameStats } from "#system/game-stats";
import type { ModifierData } from "#system/modifier-data";
import type { PokemonData } from "#system/pokemon-data";
import type { TrainerData } from "#system/trainer-data";
import { getDefaultIconProps } from "#ui/starter-select-ui-utils";

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

export type MovePool = [MoveId, MoveId, MoveId, MoveId, MoveId, MoveId, MoveId, MoveId];
export type MoveSet = [MoveId, MoveId, MoveId, MoveId];
export type CurrentMoves = [PokemonMove, PokemonMove, PokemonMove, PokemonMove];

export function toMovePool(ids: MoveId[]): MovePool {
  return [
    ids[0] || MoveId.NONE,
    ids[1] || MoveId.NONE,
    ids[2] || MoveId.NONE,
    ids[3] || MoveId.NONE,
    ids[4] || MoveId.NONE,
    ids[5] || MoveId.NONE,
    ids[6] || MoveId.NONE,
    ids[7] || MoveId.NONE,
  ];
}

export function toSelectedMoves(ids: MoveId[]): MoveSet {
  return [ids[0] || MoveId.NONE, ids[1] || MoveId.NONE, ids[2] || MoveId.NONE, ids[3] || MoveId.NONE];
}

export function toCurrentMoves(ids: PokemonMove[]): CurrentMoves {
  return [
    ids[0] || PokemonMove.blankMove,
    ids[1] || PokemonMove.blankMove,
    ids[2] || PokemonMove.blankMove,
    ids[3] || PokemonMove.blankMove,
  ];
}

export const blankMovePool: MovePool = [
  MoveId.NONE,
  MoveId.NONE,
  MoveId.NONE,
  MoveId.NONE,
  MoveId.NONE,
  MoveId.NONE,
  MoveId.NONE,
  MoveId.NONE,
];
export const blankSelectedMoves: MoveSet = [MoveId.NONE, MoveId.NONE, MoveId.NONE, MoveId.NONE];
export const blankCurrentMoves: CurrentMoves = [
  PokemonMove.blankMove,
  PokemonMove.blankMove,
  PokemonMove.blankMove,
  PokemonMove.blankMove,
];

export interface CharacterPreferenceSelections {
  abilityIndex?: number | undefined;
  passive?: boolean | undefined;
  favorite?: boolean | undefined;
  gender?: Gender | undefined;
  formIndex?: number | undefined;
  nature?: number | undefined;
  nickname?: string | undefined;
  shiny?: boolean | undefined;
  tera?: PokemonType | undefined;
  variant?: Variant | undefined;
  selectedMoves?: MoveSet | undefined;
}

export class CharacterPreference {
  abilityIndex: number;
  passive: boolean;
  favorite: boolean;
  gender: Gender;
  formIndex: number;
  nature: number;
  nickname?: string | undefined;
  shiny: boolean;
  tera: PokemonType;
  variant: Variant;
  selectedMoves: MoveSet;
  unselectedMoves: MoveSet;

  constructor(id: CharacterId, selections: CharacterPreferenceSelections) {
    const char = characterRegistry.getCharacter(id);
    const defaults = getDefaultIconProps(id);
    this.abilityIndex = selections.formIndex || 0;
    this.passive = selections.passive || false;
    this.favorite = selections.favorite || false;
    this.gender = selections.gender ?? char.identity?.gender ?? Gender.GENDERLESS;
    this.nature = selections.nature ?? char.identity?.nature ?? Nature.DOCILE;
    this.shiny = selections.shiny ?? defaults.shiny;
    this.variant = selections.variant ?? defaults.variant;
    this.formIndex = selections.formIndex ?? defaults.formIndex;
  }
}

export type AllPreferences = Record<CharacterId, CharacterPreference>;

export interface IconProps {
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
  moveset?: MoveSet | undefined;
  pokerus: boolean;
  nickname?: string | undefined;
  teraType?: PokemonType | undefined;
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

export interface CharPreferenceData {
  [key: number]: CharacterPreferenceSelections;
}

// TODO: Rework into a bitmask
export type TutorialFlags = {
  [key in Tutorial]: boolean;
};

// TODO: Rework into a bitmask
export interface SeenDialogues {
  [key: string]: boolean;
}

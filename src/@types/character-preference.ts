import { getDefaultSelectedMoves, getDefaultUnselectedMoves } from "#balance/custom-characters";
import { Gender } from "#data/gender";
import type { MoveSet } from "#data/moveset";
import { Nature } from "#enums/nature";
import type { PokemonType } from "#enums/pokemon-type";
import type { Variant } from "#sprites/variant";
import type { Character, PreferenceDataMap } from "#types/pokemon-species";
import type { CharacterPreferenceSelections } from "#types/save-data";
import { getDefaultIconProps } from "#ui/starter-select-ui-utils";

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
  activeMoves: MoveSet;
  reserveMoves: MoveSet;

  constructor(char: Character, selections?: CharacterPreferenceSelections) {
    const defaults = getDefaultIconProps(char);
    this.abilityIndex = selections?.formIndex || 0;
    this.passive = selections?.passive || false;
    this.favorite = selections?.favorite || false;
    this.gender = selections?.gender ?? char.identity?.gender ?? Gender.GENDERLESS;
    this.nature = selections?.nature ?? char.identity?.nature ?? Nature.DOCILE;
    this.shiny = selections?.shiny ?? defaults.shiny;
    this.variant = selections?.variant ?? defaults.variant;
    this.formIndex = selections?.formIndex ?? defaults.formIndex;
    this.activeMoves = getDefaultSelectedMoves(char);
    this.reserveMoves = getDefaultUnselectedMoves(char);
  }
}

export function initPreferences(chars: Character[]): PreferenceDataMap {
  const map: PreferenceDataMap = {} as PreferenceDataMap;
  for (const char of chars) {
    map[char.id] = new CharacterPreference(char);
  }
  return map;
}

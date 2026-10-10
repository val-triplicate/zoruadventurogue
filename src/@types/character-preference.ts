import { getDefaultSelectedMoves, getDefaultUnselectedMoves } from "#balance/custom-characters";
import { Gender } from "#data/gender";
import type { MoveSet } from "#data/moveset";
import { Nature } from "#enums/nature";
import type { PokemonType } from "#enums/pokemon-type";
import type { Variant } from "#sprites/variant";
import type { Character, PreferenceDataMap } from "#types/pokemon-species";
import type { IconProps } from "#types/save-data";

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

  constructor(char: Character) {
    const defaults = getDefaultIconProps(char);
    this.abilityIndex = 0;
    this.passive = false;
    this.favorite = false;
    this.gender = Gender.GENDERLESS;
    this.nature = Nature.DOCILE;
    this.shiny = defaults.shiny;
    this.variant = defaults.variant;
    this.formIndex = defaults.formIndex;
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

export function getIconProps(char: Character, preferences?: CharacterPreference): IconProps {
  const defaults = getDefaultIconProps(char);
  return {
    shiny: preferences?.shiny ?? defaults.shiny,
    variant: preferences?.variant ?? defaults.variant,
    gender: preferences?.gender ?? Gender.GENDERLESS,
    formIndex: preferences?.formIndex ?? defaults.formIndex,
  };
}

export function getDefaultIconProps(char: Character): IconProps {
  const gender = char?.identity?.gender || Gender.GENDERLESS;
  const formIndex = char?.identity?.formIndex || 0;
  const identity = char?.identity;

  if (identity?.variants?.unshiny) {
    return { shiny: false, gender, variant: 0, formIndex };
  }
  if (identity?.variants?.standard) {
    return { shiny: true, gender, variant: 0, formIndex };
  }
  if (identity?.variants?.rare) {
    return { shiny: false, gender, variant: 1, formIndex };
  }
  if (identity?.variants?.epic) {
    return { shiny: false, gender, variant: 2, formIndex };
  }
  return { shiny: false, gender, variant: 0, formIndex };
}

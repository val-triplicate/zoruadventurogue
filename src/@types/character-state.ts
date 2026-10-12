import { getFormIndex, getGender, getName, isShiny } from "#data/characters/character-identities";
import { getDefaultActiveMoves, getDefaultReserveMoves } from "#data/characters/character-move-pools";
import { Gender } from "#data/gender";
import type { MoveSet } from "#data/moveset";
import { Nature } from "#enums/nature";
import type { PokemonType } from "#enums/pokemon-type";
import type { Variant } from "#sprites/variant";
import type { PreferenceDataMap } from "#types/pokemon-species";
import type { IconProps } from "#types/save-data";
import type { Character } from "../data/characters/constant-data/character-data-objects";

export class CharacterState {
  abilityIndex: number;
  passive: boolean;
  favorite: boolean;
  gender: Gender;
  formIndex: number;
  nature: number;
  name?: string | undefined;
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
    this.name = getName(char);
    this.shiny = defaults.shiny;
    this.variant = defaults.variant;
    this.formIndex = defaults.formIndex;
    this.activeMoves = getDefaultActiveMoves(char);
    this.reserveMoves = getDefaultReserveMoves(char);
  }
}

export function initPreferences(chars: Character[]): PreferenceDataMap {
  const map: PreferenceDataMap = {} as PreferenceDataMap;
  for (const char of chars) {
    map[char.id] = new CharacterState(char);
  }
  return map;
}

export function getIconProps(char: Character, preferences?: CharacterState): IconProps {
  const defaults = getDefaultIconProps(char);
  return {
    shiny: preferences?.shiny ?? defaults.shiny,
    variant: preferences?.variant ?? defaults.variant,
    gender: preferences?.gender ?? Gender.GENDERLESS,
    formIndex: preferences?.formIndex ?? defaults.formIndex,
  };
}

export function getDefaultIconProps(char: Character): IconProps {
  return { shiny: isShiny(char), gender: getGender(char), variant: 0, formIndex: getFormIndex(char) };
}

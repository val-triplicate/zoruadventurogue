import { getCustomName, getFormIndex, getGender, isShiny } from "#data/characters/character-identities";
import { getDefaultActiveMoves, getDefaultReserveMoves } from "#data/characters/character-move-pools";
import { getBalance } from "#data/characters/constant-data/character-data-arrays";
import type { CharacterId } from "#data/characters/types/character-types-enums";
import { Gender } from "#data/gender";
import type { MoveSet } from "#data/moveset";
import type { AbilityId } from "#enums/ability-id";
import { Nature } from "#enums/nature";
import type { PokemonType } from "#enums/pokemon-type";
import type { Variant } from "#sprites/variant";
import type { IconProps } from "#types/save-data";

export class CharacterState {
  ability: AbilityId;
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

  constructor(id: CharacterId) {
    const defaults = getDefaultIconProps(id);
    this.ability = getBalance(id).ability;
    this.passive = false;
    this.favorite = false;
    this.gender = Gender.GENDERLESS;
    this.nature = Nature.DOCILE;
    this.name = getCustomName(id);
    this.shiny = defaults.shiny;
    this.variant = defaults.variant;
    this.formIndex = defaults.formIndex;
    this.activeMoves = getDefaultActiveMoves(id);
    this.reserveMoves = getDefaultReserveMoves(id);
  }
}

export function getIconProps(id: CharacterId, preferences?: CharacterState): IconProps {
  const defaults = getDefaultIconProps(id);
  return {
    shiny: preferences?.shiny ?? defaults.shiny,
    variant: preferences?.variant ?? defaults.variant,
    gender: preferences?.gender ?? Gender.GENDERLESS,
    formIndex: preferences?.formIndex ?? defaults.formIndex,
  };
}

export function getDefaultIconProps(id: CharacterId): IconProps {
  return { shiny: isShiny(id), gender: getGender(id), variant: 0, formIndex: getFormIndex(id) };
}

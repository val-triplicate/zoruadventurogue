import { getCustomName, getFormIndex, getGender, isShiny } from "#balance/characters/character-identities";
import { getDefaultActiveMoves, getDefaultReserveMoves } from "#balance/characters/character-move-pools";
import type { CharacterId } from "#balance/characters/types/character-types-enums";
import type { BigGender } from "#data/big-gender";
import { Nature } from "#enums/nature";
import type { PokemonType } from "#enums/pokemon-type";
import type { Variant } from "#sprites/variant";
import type { StarterMoveset } from "#types/save-data";

export class CharacterState {
  hiddenAbility: boolean;
  passive: boolean;
  favorite: boolean;
  gender: BigGender;
  formIndex: number;
  nature: number;
  name?: string | undefined;
  shiny: boolean;
  tera: PokemonType;
  variant: Variant;
  activeMoves: StarterMoveset;
  reserveMoves: StarterMoveset;

  constructor(id: CharacterId) {
    this.hiddenAbility = false;
    this.passive = false;
    this.favorite = false;
    this.gender = getGender(id);
    this.nature = Nature.DOCILE;
    this.name = getCustomName(id);
    this.shiny = isShiny(id);
    this.variant = 0;
    this.formIndex = getFormIndex(id);
    this.activeMoves = getDefaultActiveMoves(id);
    this.reserveMoves = getDefaultReserveMoves(id);
  }
}

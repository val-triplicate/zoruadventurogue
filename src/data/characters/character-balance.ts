import { BALANCES } from "#data/characters/data-maps/character-maps-objects";
import { CharacterId } from "#data/characters/types/character-types-enums";
import { CharacterBalance } from "#data/characters/types/character-types-objects";
import { type CharacterInput, fromCIdSafely } from "#data/characters/utils/character-input";
import { AbilityId } from "#enums/ability-id";
import { Nature } from "#enums/nature";
import { PokemonType } from "#enums/pokemon-type";

export function initBalances() {
  BALANCES.set(
    CharacterId.VM_VAPOREON,
    new CharacterBalance(
      [115, 90, 50, 150, 60, 100],
      AbilityId.WATER_ABSORB,
      AbilityId.BERSERK,
      Nature.RASH,
      PokemonType.ICE,
    ),
  );
  BALANCES.set(
    CharacterId.VM_MAWILE,
    new CharacterBalance(undefined, AbilityId.INTIMIDATE, AbilityId.FULL_METAL_BODY, Nature.CAREFUL, PokemonType.STEEL),
  );

  BALANCES.set(CharacterId.ES_ESPEON, new CharacterBalance());
  BALANCES.set(CharacterId.ES_SPIDOPS, new CharacterBalance());

  BALANCES.set(
    CharacterId.DS_DIA,
    new CharacterBalance(
      [1, 200, 1, 1, 200, 1],
      AbilityId.MAGIC_BOUNCE,
      AbilityId.FILTER,
      Nature.QUIET,
      PokemonType.GHOST,
    ),
  );
  BALANCES.set(
    CharacterId.DS_SILVER,
    new CharacterBalance(undefined, AbilityId.INNER_FOCUS, AbilityId.ANALYTIC, Nature.LONELY, PokemonType.GHOST),
  );
}

export function getBalanceFromMap(input: CharacterInput): CharacterBalance {
  return fromCIdSafely(input, id => BALANCES.get(id), new CharacterBalance());
}

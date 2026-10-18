import { getSpecies } from "#data/characters/character-identities";
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
      [5, 20, 1, 31, 1, 15],
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
    new CharacterBalance(undefined, AbilityId.MAGIC_BOUNCE, AbilityId.FILTER, Nature.QUIET, PokemonType.GHOST),
  );
  BALANCES.set(
    CharacterId.DS_SILVER,
    new CharacterBalance(undefined, AbilityId.INNER_FOCUS, AbilityId.ANALYTIC, Nature.LONELY, PokemonType.GHOST),
  );
}

export function getBalance(input: CharacterInput): CharacterBalance {
  return fromCIdSafely(input, id => BALANCES.get(id), new CharacterBalance());
}

export function getAbility(input: CharacterInput): AbilityId {
  return getBalance(input).ability ?? getSpecies(input).ability1;
}

export function getPassive(input: CharacterInput): AbilityId {
  return getBalance(input).passive ?? getSpecies(input).getPassiveAbility(0);
}

export function getTeraType(input: CharacterInput): PokemonType {
  return getBalance(input).teraType ?? getSpecies(input).type1;
}

export function getNature(input: CharacterInput): Nature {
  return getBalance(input).nature ?? Nature.DOCILE;
}

import { getSpecies } from "#data/characters/character-identities";
import { BALANCES } from "#data/characters/data-maps/character-maps-objects";
import { CharacterId } from "#data/characters/types/character-types-enums";
import type { CharacterBalance } from "#data/characters/types/character-types-objects";
import { type CharacterInput, fromCIdSafely } from "#data/characters/utils/character-input";
import { AbilityId } from "#enums/ability-id";
import { Nature } from "#enums/nature";
import { PokemonType } from "#enums/pokemon-type";

export function initBalances() {
  BALANCES.set(CharacterId.VM_VAPOREON, {
    ability: AbilityId.WATER_ABSORB,
    passive: AbilityId.BERSERK,
    teraType: PokemonType.ICE,
    nature: Nature.RASH,
  });
  BALANCES.set(CharacterId.VM_MAWILE, {
    ability: AbilityId.INTIMIDATE,
    passive: AbilityId.FULL_METAL_BODY,
    teraType: PokemonType.STEEL,
    nature: Nature.CAREFUL,
  });

  BALANCES.set(CharacterId.ES_ESPEON, {});
  BALANCES.set(CharacterId.ES_SPIDOPS, {});

  BALANCES.set(CharacterId.DS_DIA, {
    ability: AbilityId.MAGIC_BOUNCE,
    passive: AbilityId.FILTER,
    teraType: PokemonType.GHOST,
    nature: Nature.QUIET,
  });
  BALANCES.set(CharacterId.DS_SILVER, {
    ability: AbilityId.INNER_FOCUS,
    passive: AbilityId.ANALYTIC,
    teraType: PokemonType.GHOST,
    nature: Nature.LONELY,
  });
}

export function getBalance(input: CharacterInput): CharacterBalance {
  return fromCIdSafely(input, id => BALANCES.get(id), {});
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

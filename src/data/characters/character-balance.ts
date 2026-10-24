import { CharacterId } from "#data/characters/types/character-types-enums";
import { type BaseStats, CharacterBalance } from "#data/characters/types/character-types-objects";
import { AbilityId } from "#enums/ability-id";
import { Nature } from "#enums/nature";
import { PokemonType } from "#enums/pokemon-type";

export function initBalances(): CharacterBalance[] {
  const balances: CharacterBalance[] = [];
  addBalance(
    balances,
    CharacterId.VM_VAPOREON,
    [115, 90, 50, 150, 60, 100],
    AbilityId.WATER_ABSORB,
    AbilityId.BERSERK,
    Nature.RASH,
    PokemonType.ICE,
  );
  addBalance(
    balances,
    CharacterId.VM_MAWILE,
    undefined,
    AbilityId.INTIMIDATE,
    AbilityId.FULL_METAL_BODY,
    Nature.CAREFUL,
    PokemonType.STEEL,
  );
  addBalance(balances, CharacterId.ES_ESPEON);
  addBalance(balances, CharacterId.ES_SPIDOPS);
  addBalance(
    balances,
    CharacterId.DS_DIA,
    [1, 200, 1, 1, 200, 1],
    AbilityId.MAGIC_BOUNCE,
    AbilityId.FILTER,
    Nature.QUIET,
    PokemonType.GHOST,
  );
  addBalance(
    balances,
    CharacterId.DS_SILVER,
    undefined,
    AbilityId.INNER_FOCUS,
    AbilityId.ANALYTIC,
    Nature.LONELY,
    PokemonType.GHOST,
  );
  return balances;
}

function addBalance(
  array: CharacterBalance[],
  id: CharacterId,
  stats?: BaseStats,
  ability?: AbilityId,
  passive?: AbilityId,
  nature?: Nature,
  teraType?: PokemonType,
): void {
  array[id] = new CharacterBalance(stats, ability, passive, nature, teraType);
}

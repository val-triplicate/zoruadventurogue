import { audioManager } from "#app/global-audio-manager";
import { globalScene } from "#app/global-scene";
import { speciesDataRegistry } from "#app/global-species-data-registry";
import { getPokemonNameWithAffix } from "#app/messages";
import { modifierTypes } from "#data/data-lists";
import type { Gender } from "#data/gender";
import type { PokemonSpecies } from "#data/pokemon-species";
import type { AbilityId } from "#enums/ability-id";
import { SpeciesId } from "#enums/species-id";
import type { PermanentStat } from "#enums/stat";
import { StatusEffect } from "#enums/status-effect";
import type { EnemyPokemon, PlayerPokemon, Pokemon } from "#field/pokemon";
import { PokemonHeldItemModifier } from "#modifiers/modifier";
import type { PokemonHeldItemModifierType } from "#modifiers/modifier-type";
import {
  getEncounterText,
  queueEncounterMessage,
  showEncounterText,
} from "#mystery-encounters/encounter-dialogue-utils";
import { achvs } from "#system/achv";
import { randSeedInt } from "#utils/common";
import i18next from "i18next";

/** Will give +1 level every 10 waves */
export const STANDARD_ENCOUNTER_BOOSTED_LEVEL_MODIFIER = 1;

/**
 * Gets the sprite key and file root for a given PokemonSpecies (accounts for gender, shiny, variants, forms, and experimental)
 * @param speciesId
 * @param female
 * @param formIndex
 * @param shiny
 * @param variant
 */
export function getSpriteKeysFromSpecies(
  speciesId: SpeciesId,
  gender: Gender,
  formIndex?: number,
  shiny?: boolean,
  variant?: number,
): { spriteKey: string; fileRoot: string } {
  const species = speciesDataRegistry.getSpecies(speciesId);
  const spriteKey = species.getSpriteKey(gender, formIndex ?? 0, shiny ?? false, variant ?? 0);
  const fileRoot = species.getSpriteAtlasPath(gender, formIndex ?? 0, shiny ?? false, variant ?? 0);
  return { spriteKey, fileRoot };
}

/**
 * Gets the sprite key and file root for a given Pokemon (accounts for gender, shiny, variants, forms, and experimental)
 */
export function getSpriteKeysFromPokemon(pokemon: Pokemon): {
  spriteKey: string;
  fileRoot: string;
} {
  const spriteKey = pokemon
    .getSpeciesForm()
    .getSpriteKey(pokemon.getGender(), pokemon.formIndex, pokemon.shiny, pokemon.variant);
  const fileRoot = pokemon
    .getSpeciesForm()
    .getSpriteAtlasPath(pokemon.getGender(), pokemon.formIndex, pokemon.shiny, pokemon.variant);

  return { spriteKey, fileRoot };
}

/**
 * Will never remove the player's last non-fainted Pokemon (if they only have 1).
 * Otherwise, picks a Pokemon completely at random and removes from the party
 * @param isAllowed Default `false`. If `true`, only picks from legal mons. If no legal mons are found (or there is 1, with `doNotReturnLastAllowedMon = true`), will return a mon that is not allowed.
 * @param isFainted Default `false`. If `true`, includes fainted mons.
 * @param doNotReturnLastAllowedMon Default `false`. If `true`, will never return the last unfainted pokemon in the party. Useful when this function is being used to determine what Pokemon to remove from the party (Don't want to remove last unfainted)
 * @returns
 */
export function getRandomPlayerPokemon(
  isAllowed = false,
  isFainted = false,
  doNotReturnLastAllowedMon = false,
): PlayerPokemon {
  const party = globalScene.getPlayerParty();
  let chosenIndex: number;
  let chosenPokemon: PlayerPokemon | null = null;
  const fullyLegalMons = party.filter(p => (!isAllowed || p.isAllowedInChallenge()) && (isFainted || !p.isFainted()));
  const allowedOnlyMons = party.filter(p => p.isAllowedInChallenge());

  if (doNotReturnLastAllowedMon && fullyLegalMons.length === 1) {
    // If there is only 1 legal/unfainted mon left, select from fainted legal mons
    const faintedLegalMons = party.filter(p => (!isAllowed || p.isAllowedInChallenge()) && p.isFainted());
    if (faintedLegalMons.length > 0) {
      // TODO: should this use `randSeedItem`?
      chosenIndex = randSeedInt(faintedLegalMons.length);
      chosenPokemon = faintedLegalMons[chosenIndex];
    }
  }
  if (!chosenPokemon && fullyLegalMons.length > 0) {
    // TODO: should this use `randSeedItem`?
    chosenIndex = randSeedInt(fullyLegalMons.length);
    chosenPokemon = fullyLegalMons[chosenIndex];
  }
  if (!chosenPokemon && isAllowed && allowedOnlyMons.length > 0) {
    // TODO: should this use `randSeedItem`?
    chosenIndex = randSeedInt(allowedOnlyMons.length);
    chosenPokemon = allowedOnlyMons[chosenIndex];
  }
  if (!chosenPokemon) {
    // If no other options worked, returns fully random
    // TODO: should this use `randSeedItem`?
    chosenIndex = randSeedInt(party.length);
    chosenPokemon = party[chosenIndex];
  }

  return chosenPokemon;
}

/**
 * Ties are broken by whatever mon is closer to the front of the party
 * @param scene
 * @param isAllowed Default false. If true, only picks from legal mons.
 * @param isFainted Default false. If true, includes fainted mons.
 * @returns
 */
export function getHighestLevelPlayerPokemon(isAllowed = false, isFainted = false): PlayerPokemon {
  const party = globalScene.getPlayerParty();
  let pokemon: PlayerPokemon | null = null;

  for (const p of party) {
    if (isAllowed && !p.isAllowedInChallenge()) {
      continue;
    }
    if (!isFainted && p.isFainted()) {
      continue;
    }

    pokemon = pokemon ? (pokemon?.level < p?.level ? p : pokemon) : p;
  }

  return pokemon!;
}

/**
 * Ties are broken by whatever mon is closer to the front of the party
 * @param scene
 * @param stat Stat to search for
 * @param isAllowed Default false. If true, only picks from legal mons.
 * @param isFainted Default false. If true, includes fainted mons.
 * @returns
 */
export function getHighestStatPlayerPokemon(stat: PermanentStat, isAllowed = false, isFainted = false): PlayerPokemon {
  const party = globalScene.getPlayerParty();
  let pokemon: PlayerPokemon | null = null;

  for (const p of party) {
    if (isAllowed && !p.isAllowedInChallenge()) {
      continue;
    }
    if (!isFainted && p.isFainted()) {
      continue;
    }

    pokemon = pokemon ? (pokemon.getStat(stat) < p?.getStat(stat) ? p : pokemon) : p;
  }

  return pokemon!;
}

/**
 * Ties are broken by whatever mon is closer to the front of the party
 * @param scene
 * @param isAllowed Default false. If true, only picks from legal mons.
 * @param isFainted Default false. If true, includes fainted mons.
 * @returns
 */
export function getLowestLevelPlayerPokemon(isAllowed = false, isFainted = false): PlayerPokemon {
  const party = globalScene.getPlayerParty();
  let pokemon: PlayerPokemon | null = null;

  for (const p of party) {
    if (isAllowed && !p.isAllowedInChallenge()) {
      continue;
    }
    if (!isFainted && p.isFainted()) {
      continue;
    }

    pokemon = pokemon ? (pokemon?.level > p?.level ? p : pokemon) : p;
  }

  return pokemon!;
}

/**
 * Ties are broken by whatever mon is closer to the front of the party
 * @param scene
 * @param isAllowed Default false. If true, only picks from legal mons.
 * @param isFainted Default false. If true, includes fainted mons.
 * @returns
 */
export function getHighestStatTotalPlayerPokemon(isAllowed = false, isFainted = false): PlayerPokemon {
  const party = globalScene.getPlayerParty();
  let pokemon: PlayerPokemon | null = null;

  for (const p of party) {
    if (isAllowed && !p.isAllowedInChallenge()) {
      continue;
    }
    if (!isFainted && p.isFainted()) {
      continue;
    }

    pokemon = pokemon ? (pokemon?.stats.reduce((a, b) => a + b) < p?.stats.reduce((a, b) => a + b) ? p : pokemon) : p;
  }

  return pokemon!;
}

/**
 * Takes care of handling player pokemon KO (with all its side effects)
 *
 * @param scene the battle scene
 * @param pokemon the player pokemon to KO
 */
export function koPlayerPokemon(pokemon: PlayerPokemon) {
  pokemon.hp = 0;
  pokemon.doSetStatus(StatusEffect.FAINT);
  pokemon.updateInfo();
  queueEncounterMessage(
    i18next.t("battle:fainted", {
      pokemonNameWithAffix: getPokemonNameWithAffix(pokemon),
    }),
  );
}

/**
 * Handles applying hp changes to a player pokemon.
 * Takes care of not going below `0`, above max-hp, adding `FNT` status correctly and updating the pokemon info.
 * TODO: should we handle special cases like wonder-guard/shedinja?
 * @param scene the battle scene
 * @param pokemon the player pokemon to apply the hp change to
 * @param value the hp change amount. Positive for heal. Negative for damage
 *
 */
function applyHpChangeToPokemon(pokemon: PlayerPokemon, value: number) {
  const hpChange = Math.round(pokemon.hp + value);
  const nextHp = Math.max(Math.min(hpChange, pokemon.getMaxHp()), 0);
  if (nextHp === 0) {
    koPlayerPokemon(pokemon);
  } else {
    pokemon.hp = nextHp;
  }
}

/**
 * Handles applying damage to a player pokemon
 * @param scene the battle scene
 * @param pokemon the player pokemon to apply damage to
 * @param damage the amount of damage to apply
 * @see {@linkcode applyHpChangeToPokemon}
 */
export function applyDamageToPokemon(pokemon: PlayerPokemon, damage: number) {
  if (damage <= 0) {
    console.warn(
      "Healing pokemon with `applyDamageToPokemon` is not recommended! Please use `applyHealToPokemon` instead.",
    );
  }
  // If a Pokemon would faint from the damage applied, its HP is instead set to 1.
  if (pokemon.isAllowedInBattle() && pokemon.hp - damage <= 0) {
    damage = pokemon.hp - 1;
  }
  applyHpChangeToPokemon(pokemon, -damage);
}

/**
 * Handles applying heal to a player pokemon
 * @param scene the battle scene
 * @param pokemon the player pokemon to apply heal to
 * @param heal the amount of heal to apply
 * @see {@linkcode applyHpChangeToPokemon}
 */
export function applyHealToPokemon(pokemon: PlayerPokemon, heal: number) {
  if (heal <= 0) {
    console.warn(
      "Damaging pokemon with `applyHealToPokemon` is not recommended! Please use `applyDamageToPokemon` instead.",
    );
  }

  applyHpChangeToPokemon(pokemon, heal);
}

/**
 * Will modify all of a Pokemon's base stats by a flat value
 * Base stats can never go below 1
 * @param pokemon
 * @param value
 */
export async function modifyPlayerPokemonBST(pokemon: PlayerPokemon, good: boolean) {
  const modType = modifierTypes
    .MYSTERY_ENCOUNTER_SHUCKLE_JUICE()
    .generateType(globalScene.getPlayerParty(), [good ? 10 : -15])
    ?.withIdFromFunc(modifierTypes.MYSTERY_ENCOUNTER_SHUCKLE_JUICE);
  const modifier = modType?.newModifier(pokemon);
  if (modifier) {
    globalScene.addModifier(modifier, false, false, false, true);
    pokemon.calculateStats();
  }
}

/**
 * Will attempt to add a new modifier to a Pokemon.
 * If the Pokemon already has max stacks of that item, it will instead apply 'fallbackModifierType', if specified.
 * @param scene
 * @param pokemon
 * @param modType
 * @param fallbackModifierType
 */
export async function applyModifierTypeToPlayerPokemon(
  pokemon: PlayerPokemon,
  modType: PokemonHeldItemModifierType,
  fallbackModifierType?: PokemonHeldItemModifierType,
) {
  // Check if the Pokemon has max stacks of that item already
  const modifier = modType.newModifier(pokemon);
  const existing = globalScene.findModifier(
    (m): m is PokemonHeldItemModifier =>
      m instanceof PokemonHeldItemModifier
      && m.type.id === modType.id
      && m.pokemonId === pokemon.id
      && m.matchType(modifier),
  ) as PokemonHeldItemModifier | undefined;

  // At max stacks
  if (existing && existing.getStackCount() >= existing.getMaxStackCount()) {
    if (!fallbackModifierType) {
      return;
    }

    // Apply fallback
    return applyModifierTypeToPlayerPokemon(pokemon, fallbackModifierType);
  }

  globalScene.addModifier(modifier, false, false, false, true);
}

/**
 * Animates a wild pokemon "fleeing", including sfx and messaging
 * @param scene
 * @param pokemon
 */
export async function doPokemonFlee(pokemon: EnemyPokemon): Promise<void> {
  await new Promise<void>(resolve => {
    audioManager.playSound("se/flee");
    // Ease pokemon out
    globalScene.tweens.add({
      targets: pokemon,
      x: "+=16",
      y: "-=16",
      alpha: 0,
      duration: 1000,
      ease: "Sine.easeIn",
      scale: pokemon.getSpriteScale(),
      onComplete: () => {
        pokemon.setVisible(false);
        pokemon.leaveField(true, true, true);
        showEncounterText(
          i18next.t("battle:pokemonFled", {
            pokemonName: pokemon.getNameToRender(),
          }),
          null,
          600,
          false,
        ).then(() => {
          resolve();
        });
      },
    });
  });
}

/**
 * Handles the player fleeing from a wild pokemon, including sfx and messaging
 * @param scene
 * @param pokemon
 */
export function doPlayerFlee(pokemon: EnemyPokemon): Promise<void> {
  return new Promise<void>(resolve => {
    // Ease pokemon out
    globalScene.tweens.add({
      targets: pokemon,
      x: "+=16",
      y: "-=16",
      alpha: 0,
      duration: 1000,
      ease: "Sine.easeIn",
      scale: pokemon.getSpriteScale(),
      onComplete: () => {
        pokemon.setVisible(false);
        pokemon.leaveField(true, true, true);
        showEncounterText(
          i18next.t("battle:playerFled", {
            pokemonName: pokemon.getNameToRender(),
          }),
          null,
          600,
          false,
        ).then(() => {
          resolve();
        });
      },
    });
  });
}

/**
 * Bug Species and their corresponding weights
 */
const GOLDEN_BUG_NET_SPECIES_POOL: [SpeciesId, number][] = [
  [SpeciesId.SCYTHER, 40],
  [SpeciesId.SCIZOR, 40],
  [SpeciesId.KLEAVOR, 40],
  [SpeciesId.PINSIR, 40],
  [SpeciesId.HERACROSS, 40],
  [SpeciesId.YANMA, 40],
  [SpeciesId.YANMEGA, 40],
  [SpeciesId.SHUCKLE, 40],
  [SpeciesId.ANORITH, 40],
  [SpeciesId.ARMALDO, 40],
  [SpeciesId.ESCAVALIER, 40],
  [SpeciesId.ACCELGOR, 40],
  [SpeciesId.JOLTIK, 40],
  [SpeciesId.GALVANTULA, 40],
  [SpeciesId.DURANT, 40],
  [SpeciesId.LARVESTA, 40],
  [SpeciesId.VOLCARONA, 40],
  [SpeciesId.DEWPIDER, 40],
  [SpeciesId.ARAQUANID, 40],
  [SpeciesId.WIMPOD, 40],
  [SpeciesId.GOLISOPOD, 40],
  [SpeciesId.SIZZLIPEDE, 40],
  [SpeciesId.CENTISKORCH, 40],
  [SpeciesId.NYMBLE, 40],
  [SpeciesId.LOKIX, 40],
  [SpeciesId.BUZZWOLE, 1],
  [SpeciesId.PHEROMOSA, 1],
];

/**
 * Will randomly return one of the species from GOLDEN_BUG_NET_SPECIES_POOL, based on their weights.
 * Will also check for and evolve pokemon based on level.
 */
export function getGoldenBugNetSpecies(level: number): PokemonSpecies {
  const totalWeight = GOLDEN_BUG_NET_SPECIES_POOL.reduce((a, b) => a + b[1], 0);
  const roll = randSeedInt(totalWeight);

  let w = 0;
  for (const speciesWeightPair of GOLDEN_BUG_NET_SPECIES_POOL) {
    w += speciesWeightPair[1];
    if (roll < w) {
      const initialSpecies = speciesDataRegistry.getSpecies(speciesWeightPair[0]);
      return speciesDataRegistry.getSpecies(initialSpecies.getWildSpeciesForLevel(level, true, false));
    }
  }

  // Defaults to Scyther
  return speciesDataRegistry.getSpecies(SpeciesId.SCYTHER);
}

/**
 * Generates a Pokemon level for a given wave, with an option to increase/decrease by a scaling modifier
 * @param scene
 * @param levelAdditiveModifier Default 0. will add +(1 level / 10 waves * levelAdditiveModifier) to the level calculation
 */
export function getEncounterPokemonLevelForWave(levelAdditiveModifier = 0) {
  const currentBattle = globalScene.currentBattle;
  const baseLevel = currentBattle.getLevelForWave();

  // Add a level scaling modifier that is (+1 level per 10 waves) * levelAdditiveModifier
  return baseLevel + Math.max(Math.round((currentBattle.waveIndex / 10) * levelAdditiveModifier), 0);
}

export async function addPokemonDataToDexAndValidateAchievements(pokemon: PlayerPokemon) {
  const speciesForm = pokemon.getSpeciesForm();

  if (speciesForm.abilityHidden && pokemon.abilityIndex === speciesForm.getAbilityCount() - 1) {
    globalScene.validateAchv(achvs.HIDDEN_ABILITY);
  }

  if (pokemon.species.subLegendary) {
    globalScene.validateAchv(achvs.CATCH_SUB_LEGENDARY);
  }

  if (pokemon.species.legendary) {
    globalScene.validateAchv(achvs.CATCH_LEGENDARY);
  }

  if (pokemon.species.mythical) {
    globalScene.validateAchv(achvs.CATCH_MYTHICAL);
  }

  globalScene.gameData.updateSpeciesDexIvs(pokemon.species.getRootSpeciesId(true), pokemon.ivs);
  return globalScene.gameData.setPokemonCaught(pokemon, true, false, false);
}

/**
 * Checks if a Pokemon is allowed under a challenge, and allowed in battle.
 * If both are true, returns `null`.
 * If one of them is not true, returns message content that the Pokemon is invalid.
 * Typically used for cheecking whether a Pokemon can be selected for a {@linkcode MysteryEncounterOption}
 * @param pokemon
 * @param scene
 * @param invalidSelectionKey
 */
export function isPokemonValidForEncounterOptionSelection(
  pokemon: Pokemon,
  invalidSelectionKey: string,
): string | null {
  if (!pokemon.isAllowedInChallenge()) {
    return (
      i18next.t("partyUiHandler:cantBeUsed", {
        pokemonName: pokemon.getNameToRender(),
      }) ?? null
    );
  }
  if (!pokemon.isAllowedInBattle()) {
    return getEncounterText(invalidSelectionKey) ?? null;
  }

  return null;
}

/**
 * Permanently overrides the ability (not passive) of a pokemon.
 * If the pokemon is a fusion, instead overrides the fused pokemon's ability.
 */
export function applyAbilityOverrideToPokemon(pokemon: Pokemon, ability: AbilityId) {
  pokemon.customPokemonData.ability = ability;
}

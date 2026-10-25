import { VALUE_REDUCTION_MAX } from "#app/constants";
import { globalScene } from "#app/global-scene";
import { speciesDataRegistry } from "#app/global-species-data-registry";
import { getName, getSpeciesId } from "#balance/characters/character-identities";
import type { CharacterId } from "#balance/characters/types/character-types-enums";
import { speciesEggMoves } from "#balance/egg-moves";
import { getPassiveCandyCount, getSameSpeciesEggCandyCounts, getValueReductionCandyCounts } from "#balance/starters";
import { ChallengeType } from "#enums/challenge-type";
import { GameModes } from "#enums/game-modes";
import type { MoveId } from "#enums/move-id";
import { Passive } from "#enums/passive";
import { SortCriteria, type SortDirection } from "#ui/dropdown";
import { applyChallenges, checkStarterValidForChallenge } from "#utils/challenge-utils";
import { ValueHolder } from "#utils/value-holder";
import i18next from "i18next";

/**
 * Determines if a passive upgrade is available for the given species ID
 * @param speciesId - The ID of the species to check the passive of
 * @param gameData - (Default `globalScene.gameData`) Game data to use
 * @returns Whether the user has enough candies and a passive has not been unlocked already
 */
export function isPassiveAvailable(speciesId: number, gameData = globalScene.gameData): boolean {
  // Get this species ID's starter data
  const starterId = speciesDataRegistry.getStarter(speciesId);
  const starterData = gameData.starterData[starterId];

  return (
    starterData.candyCount >= getPassiveCandyCount(speciesDataRegistry.getStarterCost(starterId))
    && !(starterData.passiveAttr & Passive.UNLOCKED)
  );
}

/**
 * Determines if a value reduction upgrade is available for the given species ID
 * @param speciesId - The ID of the species to check the value reduction of
 * @param gameData - (Default `globalScene.gameData`) Game data to use
 * @returns Whether the user has enough candies and all value reductions have not been unlocked already
 */
export function isValueReductionAvailable(speciesId: number, gameData = globalScene.gameData): boolean {
  const starterId = speciesDataRegistry.getStarter(speciesId);
  const starterData = gameData.starterData[starterId];

  return (
    starterData.candyCount
      >= getValueReductionCandyCounts(speciesDataRegistry.getStarterCost(starterId))[starterData.valueReduction]
    && starterData.valueReduction < VALUE_REDUCTION_MAX
  );
}

/**
 * Determines if an egg for the same starter can be bought for the given species ID
 * @param speciesId - The ID of the species to check the value reduction of
 * @param gameData - (Default `globalScene.gameData`) Game data to use
 * @returns Whether the user has enough candies
 */
export function isSameSpeciesEggAvailable(speciesId: number, gameData = globalScene.gameData): boolean {
  const starterId = speciesDataRegistry.getStarter(speciesId);
  return (
    gameData.starterData[starterId].candyCount
    >= getSameSpeciesEggCandyCounts(speciesDataRegistry.getStarterCost(starterId))
  );
}

/**
 * Determines if a character is valid for challenges.
 * @param charId - The ID of the character to check
 * @returns whether the character is valid for challenges
 */
export function isCharacterValidForChallenge(charId: CharacterId): boolean {
  return checkStarterValidForChallenge(charId, true);
}

interface StarterSelectLanguageSetting {
  starterInfoTextSize: string;
  instructionTextSize: string;
  starterInfoXPos?: number;
  starterInfoYOffset?: number;
}

const languageSettings: { [key: string]: StarterSelectLanguageSetting } = {
  en: {
    starterInfoTextSize: "56px",
    instructionTextSize: "28px",
  },
  de: {
    starterInfoTextSize: "54px",
    instructionTextSize: "25px",
    starterInfoXPos: 35,
  },
  "es-ES": {
    starterInfoTextSize: "52px",
    instructionTextSize: "28px",
    starterInfoYOffset: 0.5,
    starterInfoXPos: 39,
  },
  "es-419": {
    starterInfoTextSize: "50px",
    instructionTextSize: "28px",
    starterInfoYOffset: 0.5,
    starterInfoXPos: 37,
  },
  fr: {
    starterInfoTextSize: "54px",
    instructionTextSize: "28px",
  },
  it: {
    starterInfoTextSize: "56px",
    instructionTextSize: "28px",
  },
  "pt-BR": {
    starterInfoTextSize: "54px",
    instructionTextSize: "28px",
    starterInfoXPos: 37,
  },
  zh: {
    starterInfoTextSize: "56px",
    instructionTextSize: "26px",
    starterInfoXPos: 26,
  },
  ko: {
    starterInfoTextSize: "60px",
    instructionTextSize: "28px",
    starterInfoYOffset: -0.5,
    starterInfoXPos: 30,
  },
  ja: {
    starterInfoTextSize: "48px",
    instructionTextSize: "32px",
    starterInfoYOffset: 1,
    starterInfoXPos: 32,
  },
  ca: {
    starterInfoTextSize: "48px",
    instructionTextSize: "28px",
    starterInfoYOffset: 0.5,
    starterInfoXPos: 29,
  },
  eu: {
    starterInfoTextSize: "48px",
    instructionTextSize: "28px",
    starterInfoYOffset: 0.5,
    starterInfoXPos: 29,
  },
  da: {
    starterInfoTextSize: "56px",
    instructionTextSize: "28px",
  },
  th: {
    starterInfoTextSize: "50px",
    instructionTextSize: "30px",
    starterInfoYOffset: 0.5,
    starterInfoXPos: 40,
  },
  tr: {
    starterInfoTextSize: "56px",
    instructionTextSize: "28px",
    starterInfoXPos: 34,
  },
  pl: {
    starterInfoTextSize: "48px",
    instructionTextSize: "28px",
    starterInfoYOffset: 0.5,
  },
  ru: {
    starterInfoTextSize: "46px",
    instructionTextSize: "28px",
    starterInfoYOffset: 0.5,
    starterInfoXPos: 26,
  },
  uk: {
    starterInfoTextSize: "46px",
    instructionTextSize: "28px",
    starterInfoYOffset: 0.5,
    starterInfoXPos: 26,
  },
  id: {
    starterInfoTextSize: "48px",
    instructionTextSize: "28px",
    starterInfoYOffset: 0.5,
    starterInfoXPos: 37,
  },
  hi: {
    starterInfoTextSize: "56px",
    instructionTextSize: "28px",
  },
  vi: {
    starterInfoTextSize: "50px",
    instructionTextSize: "28px",
    starterInfoYOffset: 0.5,
    starterInfoXPos: 34,
  },
  tl: {
    starterInfoTextSize: "56px",
    instructionTextSize: "28px",
  },
  sv: {
    starterInfoTextSize: "56px",
    instructionTextSize: "28px",
  },
};

export function getStarterSelectTextSettings(): StarterSelectLanguageSetting {
  const currentLanguage = i18next.resolvedLanguage ?? "en";
  const textSettings = languageSettings[currentLanguage] ?? languageSettings["en"];
  return textSettings;
}

/** @returns The limit on starter points available for the current run, taking challenges into account */
export function getRunValueLimit(): number {
  const valueLimit = new ValueHolder(0);
  switch (globalScene.gameMode.modeId) {
    case GameModes.ENDLESS:
    case GameModes.SPLICED_ENDLESS:
      valueLimit.value = 15;
      break;
    default:
      valueLimit.value = 10;
  }

  applyChallenges(ChallengeType.STARTER_POINTS, valueLimit);

  return valueLimit.value;
}

// noinspection JSUnusedLocalSymbols
/**
 * Calculate the total value of a given party.
 * @param party - An array of species IDs representing the player's starter party
 * @returns The total value of the party
 */
export function getPartyValue(party: CharacterId[]): number {
  return 0;
}

/**
 * Sort an array of {@linkcode CharacterId} based on a given criteria and direction.
 * @param charIds - An array of character IDs to be sorted
 * @param sort - The criteria by which the species should be sorted
 * @param dir - The direction in which the species should be sorted
 */
export function sortCharacters(charIds: CharacterId[], sort: SortCriteria, dir: SortDirection): void {
  charIds.sort((a, b): number => {
    const idSort = (a - b) * -dir;
    const speciesA = speciesDataRegistry.getBaseSpecies(a);
    const speciesB = speciesDataRegistry.getBaseSpecies(b);

    const nameA = getName(a);
    const nameB = getName(b);

    const speciesIdSort = (getSpeciesId(a) - getSpeciesId(b)) * -dir;
    const nameSort = getName(a).localeCompare(getName(b)) * -dir;
    const speciesNameSort = speciesA.name.localeCompare(speciesB.name) * -dir;
    const both = nameA + " " + nameB + " (" + nameSort + ")";
    switch (sort) {
      case SortCriteria.CHARACTER_ID:
        return idSort;
      case SortCriteria.CHARACTER_NAME:
        return nameSort || speciesNameSort || idSort;
      case SortCriteria.SPECIES_ID:
        return speciesIdSort || idSort;
      case SortCriteria.SPECIES_NAME:
        return speciesNameSort || nameSort || idSort;
      default: // to make Biome happy
        return 0;
    }
  });
}

/**
 * Get the moves that a starter can have.
 * @param charId - The id of the character to get moves for
 * @returns An array of move IDs
 */
export function getCharacterMoves(charId: CharacterId): MoveId[] {
  const starterMoves: MoveId[] = [];
  const speciesId = getSpeciesId(charId);

  const levelMoves = speciesDataRegistry.getLevelMoves(speciesId, 0);
  applyChallenges(ChallengeType.LEVEL_UP_MOVESET, speciesDataRegistry.getSpecies(speciesId), levelMoves);
  for (const [level, moveId] of levelMoves) {
    if (level > 0 && level <= 5) {
      starterMoves.push(moveId);
    }
  }

  if (Object.hasOwn(speciesEggMoves, speciesId)) {
    for (let em = 0; em < 4; em++) {
      starterMoves.push(speciesEggMoves[speciesId][em]);
    }
  }

  return starterMoves;
}

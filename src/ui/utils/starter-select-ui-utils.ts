import { globalScene } from "#app/global-scene";
import { teamMemberDataRegistry } from "#app/global-team-member-data-registry";
import { teamMemberMoveOptions } from "#balance/egg-moves";
import { Gender } from "#data/gender";
import { AbilityAttr } from "#enums/ability-attr";
import { DexAttr } from "#enums/dex-attr";
import type { MoveId } from "#enums/move-id";
import { Nature } from "#enums/nature";
import type { TeamMemberId } from "#enums/team-member-id";
import { RibbonData } from "#system/ribbon-data";
import type { DexEntry } from "#types/dex-data";
import type { DexAttrProps, StarterDataEntry, StarterPreferences, TeamMemberPreferences } from "#types/save-data";
import type { DefinedSpeciesDetails, SpeciesDetails } from "#types/starter-select-types";
import type { StarterSpeciesId } from "#types/starter-species-id";
import { SortCriteria, type SortDirection } from "#ui/dropdown";
import { deepCopy } from "#utils/data";
import i18next from "i18next";

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

/**
 * Return a copy of the dex data and starter data for a given species,
 * modifying it by applying any challenges that restrict which options should be available.
 *
 * @param speciesId - The species id to get data for
 * @param applyChallenge - (Default `true`) Whether the current challenges should be taken into account
 * @returns A copy of the starter's {@linkcode DexEntry} and {@linkcode StarterDataEntry}
 */
export function getTeamMemberDataEntry(teamMemberId: TeamMemberId): {
  dexEntry: DexEntry;
  starterDataEntry: StarterDataEntry;
} {
  const originalDexEntry = globalScene.gameData.dexData[teamMemberId];
  const dexEntry: DexEntry = { ...originalDexEntry };
  dexEntry.ivs = [...originalDexEntry.ivs];
  dexEntry.ribbons = new RibbonData(originalDexEntry.ribbons.getRibbons());
  const starterDataEntry: StarterDataEntry = deepCopy(globalScene.gameData.starterData[teamMemberId]);
  return { dexEntry, starterDataEntry };
}

/**
 * Creates a temporary dex attr props that will be used to check whether a pokemon is valid for a challenge
 * and to display the correct shiny, variant, and form based on the starter preferences
 *
 * @param speciesId - The id of the species to get props for
 * @param starterPreferences - (Optional) The {@linkcode StarterPreferences} of the starter
 * @returns the dex props as a `bigint`
 */
export function getDexAttrFromPreferences(
  teamMemberId: TeamMemberId,
  teamMemberPreferences: TeamMemberPreferences = {},
): bigint {
  let props = 0n;
  const { dexEntry } = getTeamMemberDataEntry(teamMemberId);
  const caughtAttr = dexEntry.caughtAttr;

  /*
   * This checks the gender of the pokemon by checking:
   * - That the starter preferences for the species exist, and if so, if it's female.
   *   If so, it'll add `DexAttr.FEMALE` to our temp props
   * - If the `caughtAttr` for the pokemon is female and NOT male - this means that the ONLY gender we've gotten is female,
   *   and we need to add `DexAttr.FEMALE` to our temp props
   *
   * If neither of these pass, we add `DexAttr.MALE` to our temp props
   */
  if (
    teamMemberPreferences.gender === Gender.FEMALE
    || ((caughtAttr & DexAttr.FEMALE) > 0n && (caughtAttr & DexAttr.MALE) === 0n)
  ) {
    props += DexAttr.FEMALE;
  } else {
    props += DexAttr.MALE;
  }

  // This part is very similar to above, but instead of for gender, it checks for shiny within starter preferences.
  // If they're not there, it enables shiny state by default if any shiny was caught
  if (teamMemberPreferences.shiny || ((caughtAttr & DexAttr.SHINY) > 0n && teamMemberPreferences?.shiny !== false)) {
    props += DexAttr.SHINY;
    if (teamMemberPreferences.variant !== undefined) {
      props += BigInt(Math.pow(2, teamMemberPreferences.variant)) * DexAttr.DEFAULT_VARIANT;
    } else if ((caughtAttr & DexAttr.VARIANT_3) > 0) {
      props += DexAttr.VARIANT_3;
    } else if ((caughtAttr & DexAttr.VARIANT_2) > 0) {
      props += DexAttr.VARIANT_2;
    } else {
      props += DexAttr.DEFAULT_VARIANT;
    }
  } else {
    props += DexAttr.NON_SHINY;
    // we add the default variant here because non shiny versions are listed as default variant
    props += DexAttr.DEFAULT_VARIANT;
  }

  if (teamMemberPreferences.formIndex) {
    props += BigInt(Math.pow(2, teamMemberPreferences.formIndex)) * DexAttr.DEFAULT_FORM;
  } else {
    // Get the first unlocked form
    props += globalScene.gameData.getFormAttr(globalScene.gameData.getFormIndex(caughtAttr));
  }

  return props;
}

/**
 * Convert starter preferences to dex props, which are used as an input by various functions.
 *
 * If any preferences are undefined, the default value for the species is given, based on its caught data.
 * @param starterId - The {@linkcode StarterSpeciesId | starter} to get dex props for
 * @param starterPreferences - (Optional) The {@linkcode StarterPreferences} for the species
 * @returns The {@linkcode DexAttrProps} for the starter
 */
export function getStarterDexAttrPropsFromPreferences(
  teamMemberId: TeamMemberId,
  teamMemberPreferences: TeamMemberPreferences = {},
): DexAttrProps {
  // Shiny is always default, except in fresh start
  const defaults = globalScene.gameData.getTeamMemberDefaultDexAttrProps(teamMemberId, true);

  return {
    shiny: teamMemberPreferences.shiny ?? defaults.shiny,
    variant: teamMemberPreferences.variant ?? defaults.variant,
    gender: teamMemberPreferences.gender ?? Gender.NONBINARY,
    formIndex: teamMemberPreferences.formIndex ?? defaults.formIndex,
  };
}

function getStarterDefaultAbilityIndex(teamMemberId: TeamMemberId): number {
  const { starterDataEntry: starterData } = getTeamMemberDataEntry(teamMemberId);
  const abilityAttr = starterData.abilityAttr;
  const species = teamMemberDataRegistry.getSpecies(teamMemberId);

  if (abilityAttr & AbilityAttr.ABILITY_1) {
    return 0;
  }
  if (!species.ability2 || abilityAttr & AbilityAttr.ABILITY_2) {
    return 1;
  }
  return 2;
}

function getTeamMemberDefaultNature(teamMemberId: TeamMemberId): Nature {
  const { dexEntry } = getTeamMemberDataEntry(teamMemberId);
  for (let n = 0; n < 25; n++) {
    if (dexEntry.natureAttr & (1 << (n + 1))) {
      return n as Nature;
    }
  }
  return Nature.HARDY;
}

/**
 * Convert starter preferences to {@linkcode SpeciesDetails} format.
 *
 * If any preferences are undefined, the default value for the species is given, based on its caught data.
 * @param starterId - The {@linkcode StarterSpeciesId | starter} to get dex props for
 * @param starterPreferences - (Optional) The {@linkcode StarterPreferences} for the species
 * @returns The data in `SpeciesDetails` format
 */
export function getStarterDetailsFromPreferences(
  teamMemberId: TeamMemberId,
  teamMemberPreferences: TeamMemberPreferences = {},
) {
  let { gender, formIndex, shiny, variant } = getStarterDexAttrPropsFromPreferences(
    teamMemberId,
    teamMemberPreferences,
  );
  gender = gender || Gender.GENDERLESS;
  const species = teamMemberDataRegistry.getSpecies(teamMemberId);
  const abilityIndex = teamMemberPreferences.abilityIndex ?? getStarterDefaultAbilityIndex(teamMemberId);
  const natureIndex = teamMemberPreferences.nature ?? getTeamMemberDefaultNature(teamMemberId);
  const teraType = teamMemberPreferences.tera ?? species.type1;

  return { shiny, formIndex, gender, variant, abilityIndex, natureIndex, teraType } satisfies DefinedSpeciesDetails;
}

/**
 * Sort an array of {@linkcode StarterSpeciesId} based on a given criteria and direction.
 * @param speciesIds - An array of species IDs to be sorted
 * @param sort - The criteria by which the species hould be sorted
 * @param dir - The direction in which the species should be sorted
 */
export function sortTeamMembers(teamMemberIds: TeamMemberId[], sort: SortCriteria, dir: SortDirection): void {
  teamMemberIds.sort((a, b) => {
    switch (sort) {
      case SortCriteria.NUMBER:
        return (a - b) * -dir;
      case SortCriteria.NAME:
        return teamMemberDataRegistry.getName(a).localeCompare(teamMemberDataRegistry.getName(b)) * -dir;
      default: // to make Biome happy
        sort satisfies never;
        return 0;
    }
  });
}

/**
 * Get the moves that a starter can have.
 * @param starterId - The id of the starter species to get moves for
 * @param formIndex - The form index of the starter to get moves for
 * @returns An array of move IDs
 */
export function getTeamMemberMoves(teamMemberId: TeamMemberId): MoveId[] {
  const moves: MoveId[] = [];
  const { starterDataEntry } = getTeamMemberDataEntry(teamMemberId);

  if (Object.hasOwn(teamMemberMoveOptions, teamMemberId)) {
    for (let em = 0; em < 4; em++) {
      if (starterDataEntry.eggMoves & (1 << em)) {
        moves.push(teamMemberMoveOptions[teamMemberId][em]);
      }
    }
  }

  return moves;
}

import { characterRegistry } from "#app/global-character-data-registry";
import { globalScene } from "#app/global-scene";
import { Gender } from "#data/gender";
import type { CharacterId } from "#enums/character-id";
import type { MoveId } from "#enums/move-id";
import { Nature } from "#enums/nature";
import type { CharacterPreferences, IconProps, TeamSaveDataEntry } from "#types/save-data";
import type { DefinedSpeciesDetails } from "#types/starter-select-types";
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

export function getTeamDataEntry(teamMemberId: CharacterId): TeamSaveDataEntry {
  return deepCopy(globalScene.gameData.teamSaveData[teamMemberId]);
}

export function getDefaultIconProps(charId: CharacterId): IconProps {
  const teamMember = characterRegistry.getCharacter(charId);
  // Default is female only for species where malePercent is not null but 0
  const gender = teamMember.identity?.gender || Gender.GENDERLESS;
  const formIndex = teamMember.identity?.formIndex || 0;
  const identity = teamMember.identity;

  if (identity?.variants?.unshiny) {
    return { shiny: false, gender, variant: 0, formIndex };
  }
  if (identity?.variants?.standard) {
    return { shiny: true, gender, variant: 0, formIndex };
  }
  if (identity?.variants?.rare) {
    return { shiny: false, gender, variant: 1, formIndex };
  }
  if (identity?.variants?.epic) {
    return { shiny: false, gender, variant: 2, formIndex };
  }
  return { shiny: false, gender, variant: 0, formIndex };
}

export function getIconPropsFromPreferences(id: CharacterId, preferences: CharacterPreferences = {}): IconProps {
  const defaults = getDefaultIconProps(id);
  return {
    shiny: preferences.shiny ?? defaults.shiny,
    variant: preferences.variant ?? defaults.variant,
    gender: preferences.gender ?? Gender.GENDERLESS,
    formIndex: preferences.formIndex ?? defaults.formIndex,
  };
}

export function getStarterDetailsFromPreferences(id: CharacterId, preference: CharacterPreferences = {}) {
  let { gender, formIndex, shiny, variant } = getIconPropsFromPreferences(id, preference);

  const char = characterRegistry.getCharacter(id);
  gender = gender || Gender.GENDERLESS;
  const species = characterRegistry.getSpecies(id);
  const abilityIndex = preference.abilityIndex ?? 0;
  const natureIndex = preference.nature ?? char.identity?.nature ?? Nature.DOCILE;
  const teraType = preference.tera ?? species.type1;

  return { shiny, formIndex, gender, variant, abilityIndex, natureIndex, teraType } satisfies DefinedSpeciesDetails;
}

/**
 * Sort an array of {@linkcode StarterSpeciesId} based on a given criteria and direction.
 * @param speciesIds - An array of species IDs to be sorted
 * @param sort - The criteria by which the species hould be sorted
 * @param dir - The direction in which the species should be sorted
 */
export function sortTeamMembers(teamMemberIds: CharacterId[], sort: SortCriteria, dir: SortDirection): void {
  teamMemberIds.sort((a, b) => {
    switch (sort) {
      case SortCriteria.NUMBER:
        return (a - b) * -dir;
      case SortCriteria.NAME:
        return characterRegistry.getName(a).localeCompare(characterRegistry.getName(b)) * -dir;
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
export function getTeamMemberMoves(teamMemberId: CharacterId): MoveId[] {
  return characterRegistry.getCharacter(teamMemberId).moves;
}

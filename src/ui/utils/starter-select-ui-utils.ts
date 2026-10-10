import { characterRegistry } from "#app/global-character-data-registry";
import { globalScene } from "#app/global-scene";
import { Gender } from "#data/gender";
import type { MovePool } from "#data/moveset";
import type { CharacterId } from "#enums/character-id";
import { Nature } from "#enums/nature";
import { getIconProps } from "#types/character-preference";
import type { TeamSaveDataEntry } from "#types/save-data";
import type { DefinedSpeciesDetails } from "#types/starter-select-types";
import { SortCriteria, type SortDirection } from "#ui/dropdown";
import { deepCopy } from "#utils/data";

interface StarterSelectLanguageSetting {
  starterInfoTextSize: string;
  instructionTextSize: string;
  starterInfoXPos?: number;
  starterInfoYOffset?: number;
}

const languageSettings: StarterSelectLanguageSetting = { starterInfoTextSize: "56px", instructionTextSize: "28px" };

export function getStarterSelectTextSettings(): StarterSelectLanguageSetting {
  return languageSettings;
}

export function getTeamDataEntry(teamMemberId: CharacterId): TeamSaveDataEntry {
  return deepCopy(globalScene.gameData.teamSaveData[teamMemberId]);
}

export function getStarterDetailsFromPreferences(id: CharacterId) {
  const char = characterRegistry.getCharacter(id);
  const preference = characterRegistry.getPreferences(id);
  let { gender, formIndex, shiny, variant } = getIconProps(char, preference);

  gender = gender || Gender.GENDERLESS;
  const species = characterRegistry.getSpecies(id);
  const abilityIndex = preference.abilityIndex ?? 0;
  const natureIndex = preference.nature ?? char.identity?.nature ?? Nature.DOCILE;
  const teraType = preference.tera ?? species.type1;

  return { shiny, formIndex, gender, variant, abilityIndex, natureIndex, teraType } satisfies DefinedSpeciesDetails;
}

export function sortCharacters(ids: CharacterId[], sort: SortCriteria, dir: SortDirection): void {
  ids.sort((a, b) => {
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

export function getMovePool(id: CharacterId): MovePool {
  return characterRegistry.getCharacter(id).movePool;
}

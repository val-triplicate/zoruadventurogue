import { globalScene } from "#app/global-scene";
import { getName } from "#data/characters/character-identities";
import type { CharacterId } from "#enums/character-id";
import type { TeamSaveDataEntry } from "#types/save-data";
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

export function sortCharacters(ids: CharacterId[], sort: SortCriteria, dir: SortDirection): void {
  ids.sort((a, b) => {
    switch (sort) {
      case SortCriteria.NUMBER:
        return (a - b) * -dir;
      case SortCriteria.NAME:
        return getName(a).localeCompare(getName(b)) * -dir;
      default: // to make Biome happy
        sort satisfies never;
        return 0;
    }
  });
}

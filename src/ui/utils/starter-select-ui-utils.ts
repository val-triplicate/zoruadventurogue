import { getName } from "#data/characters/character-identities";
import { getCharacter } from "#data/characters/constant-data/character-data-arrays";
import type { CharacterId } from "#data/characters/types/character-types-enums";
import { SortCriteria, type SortDirection } from "#ui/dropdown";

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

export function sortCharacters(inputs: CharacterId[], sort: SortCriteria, dir: SortDirection): void {
  inputs.sort((a, b) => {
    switch (sort) {
      case SortCriteria.NUMBER:
        return (a - b) * -dir;
      case SortCriteria.NAME:
        return getName(getCharacter(a)).localeCompare(getName(getCharacter(b))) * -dir;
      default: // to make Biome happy
        sort satisfies never;
        return 0;
    }
  });
}

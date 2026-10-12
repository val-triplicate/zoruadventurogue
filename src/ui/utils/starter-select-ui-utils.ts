import { getName } from "#data/characters/character-identities";
import { type CharacterInput, getCId } from "#data/characters/utils/character-input";
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

export function sortCharacters(inputs: CharacterInput[], sort: SortCriteria, dir: SortDirection): void {
  inputs.sort((a, b) => {
    switch (sort) {
      case SortCriteria.NUMBER:
        return (getCId(a) - getCId(b)) * -dir;
      case SortCriteria.NAME:
        return getName(a).localeCompare(getName(b)) * -dir;
      default: // to make Biome happy
        sort satisfies never;
        return 0;
    }
  });
}

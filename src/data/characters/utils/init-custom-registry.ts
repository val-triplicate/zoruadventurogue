import { getBalance, getIdentity, getMovePool } from "#data/characters/constant-data/character-data-arrays";
import { CharacterId, TeamId } from "#data/characters/types/character-types-enums";
import { Character } from "#data/characters/types/character-types-objects";
import { CharacterState } from "#types/character-state";
import { TeamSave } from "#types/save-data";
import { getEnumValues } from "#utils/enums";

export function initCharacters(): Character[] {
  const characters: Character[] = [];
  for (const id of getEnumValues(CharacterId)) {
    characters[id] = new Character(id, getIdentity(id), getBalance(id), getMovePool(id));
  }
  return characters;
}

export function initCharacterStates(): CharacterState[] {
  const characterStates: CharacterState[] = [];
  for (const id of getEnumValues(CharacterId)) {
    characterStates[id] = new CharacterState(id);
  }
  return characterStates;
}

export function initTeamSaves(): TeamSave[] {
  const teamSaves: TeamSave[] = [];
  for (const id of getEnumValues(TeamId)) {
    teamSaves[id] = new TeamSave(id);
  }
  return teamSaves;
}

import type { Character } from "#data/characters/constant-data/character-data-objects";
import { TEAM_MEMBERS } from "#data/characters/data-maps/character-maps-enums";
import { CharacterId, TeamId } from "#data/characters/types/character-types-enums";
import type {
  CharacterDataMap,
  CharacterStateDataMap,
  TeamDataMap,
  TeamSaveDataMap,
} from "#data/characters/types/character-types-maps";
import type { Team } from "#data/characters/types/character-types-objects";
import { type CharacterInput, fromC, fromCId, getCId } from "#data/characters/utils/character-input";
import { createCustomRegistry } from "#data/characters/utils/init-custom-registry";
import { fromT, fromTId, getTId, type TeamInput } from "#data/characters/utils/team-input";
import type { CharacterState } from "#types/character-state";
import type { TeamSave } from "#types/save-data";
import { getEnumValues } from "#utils/enums";

export let customRegistry: CustomRegistry;

class CustomRegistry {
  public readonly characterData: CharacterDataMap;
  public readonly characterStateData: CharacterStateDataMap;
  public readonly teamData: TeamDataMap;
  public readonly teamSaveData: TeamSaveDataMap;

  constructor() {
    const registry = createCustomRegistry();
    this.characterData = registry.charData;
    this.characterStateData = registry.charStateData;
    this.teamData = registry.teamData;
    this.teamSaveData = registry.teamSaveData;
  }

  public getCharacter(input: CharacterInput) {
    return fromC(
      input,
      id => this.characterData[id],
      char => char,
    );
  }

  public getCharacterIdsFromTeam(input: TeamId): CharacterId[] {
    const characterIds = TEAM_MEMBERS.get(getTId(input));
    if (characterIds) {
      return characterIds;
    }
    throw new Error("Character IDs not found for Team ID: " + getTId(input));
  }

  public getCharactersFromTeam(input: TeamId): Character[] {
    return this.getCharacterIdsFromTeam(input).map((c: CharacterInput) => this.getCharacter(c));
  }

  public getAllCharacters(): Character[] {
    return getAllCharacterIds().map(c => this.getCharacter(c));
  }

  public getCharacterState(input: CharacterInput): CharacterState {
    return fromCId(input, id => this.characterStateData[id]);
  }

  public getTeam(input: TeamInput): Team {
    return fromT(
      input,
      id => this.teamData[id],
      char => char,
    );
  }

  public getTeamIdFromCharacter(input: CharacterInput): TeamId {
    const targetCharId = getCId(input);
    for (const teamId of getAllTeamIds()) {
      const charIds = this.getCharacterIdsFromTeam(teamId);
      if (charIds[0] === targetCharId || charIds[1] === targetCharId) {
        return teamId;
      }
    }
    throw new Error("Team ID not found for Character ID: " + targetCharId);
  }

  public getTeamFromCharacter(input: CharacterInput): Team {
    return this.getTeam(this.getTeamIdFromCharacter(input));
  }

  public getAllTeams(): Team[] {
    return getAllTeamIds().map(t => this.getTeam(t));
  }

  public getTeamSave(input: TeamInput): TeamSave {
    return fromTId(input, id => this.teamSaveData[id]);
  }

  public getTeamSaveFromCharacter(input: CharacterInput): TeamSave {
    return this.getTeamSave(this.getTeamIdFromCharacter(input));
  }
}

export function getAllTeamIds(): TeamId[] {
  return getEnumValues(TeamId);
}

export function getAllCharacterIds(): CharacterId[] {
  return getEnumValues(CharacterId);
}

export function initCustomRegistry() {
  customRegistry = new CustomRegistry();
}

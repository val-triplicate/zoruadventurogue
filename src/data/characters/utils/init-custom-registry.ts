import { getBalance } from "#data/characters/character-balance";
import { getIdentity } from "#data/characters/character-identities";
import { getOriginIdFromTeam, TEAM_MEMBERS } from "#data/characters/data-maps/character-maps-enums";
import { getMovePool, initEnumMaps, initObjectMaps } from "#data/characters/data-maps/character-maps-objects";
import { type CharacterId, TeamId } from "#data/characters/types/character-types-enums";
import type {
  CharacterDataMap,
  CharacterStateDataMap,
  TeamDataMap,
  TeamSaveDataMap,
} from "#data/characters/types/character-types-maps";
import { Team } from "#data/characters/types/character-types-objects";
import { CharacterState } from "#types/character-state";
import { TeamSave } from "#types/save-data";
import { getEnumValues } from "#utils/enums";
import { Character } from "../constant-data/character-data-objects";

function createTeam(
  teamMap: TeamDataMap,
  charMap: CharacterDataMap,
  charStateMap: CharacterStateDataMap,
  teamId: TeamId,
  leaderId: CharacterId,
  followerId: CharacterId,
): Team {
  const leader = createCharacter(charMap, leaderId);
  const follower = createCharacter(charMap, followerId);
  createCharacterState(charStateMap, leader);
  createCharacterState(charStateMap, follower);
  return (teamMap[teamId] = new Team(teamId, getOriginIdFromTeam(teamId), leader, follower));
}

function createCharacter(characterMap: CharacterDataMap, id: CharacterId): Character {
  const identity = getIdentity(id);
  const balance = getBalance(id);
  const movePool = getMovePool(id);
  if (identity && balance && movePool) {
    return (characterMap[id] = new Character(id, identity, balance, movePool));
  }
  throw new Error("Missing Identity, Balance, or MovePool for Character ID: " + id);
}

function createCharacterState(map: CharacterStateDataMap, char: Character): CharacterState {
  return (map[char.id] = new CharacterState(char));
}

function createTeamSave(map: TeamSaveDataMap, id: TeamId) {
  map[id] = new TeamSave(id);
}

export function createCustomRegistry(): {
  charData: CharacterDataMap;
  charStateData: CharacterStateDataMap;
  teamData: TeamDataMap;
  teamSaveData: TeamSaveDataMap;
} {
  initEnumMaps();
  initObjectMaps();

  const charData: CharacterDataMap = {} as CharacterDataMap;
  const charStateData: CharacterStateDataMap = {} as CharacterStateDataMap;
  const teamData: TeamDataMap = {} as TeamDataMap;
  const teamSaveData: TeamSaveDataMap = {} as TeamSaveDataMap;

  for (const teamId of getEnumValues(TeamId)) {
    const teamMembers = TEAM_MEMBERS.get(teamId);
    if (teamMembers) {
      createTeam(teamData, charData, charStateData, teamId, teamMembers[0], teamMembers[1]);
      createTeamSave(teamSaveData, teamId);
    }
    createTeamSave(teamSaveData, teamId);
  }

  return { charData, charStateData, teamData, teamSaveData };
}

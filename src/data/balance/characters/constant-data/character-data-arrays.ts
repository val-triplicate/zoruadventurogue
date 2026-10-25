import { initBalances } from "#balance/characters/character-balance";
import { initBios } from "#balance/characters/character-bios";
import { initIdentities } from "#balance/characters/character-identities";
import { initMovePools } from "#balance/characters/character-move-pools";
import { initAuthors, initStories, initTeams } from "#balance/characters/constant-data/character-data-objects";
import { getTeamFromCharacterId } from "#balance/characters/data-maps/character-maps-objects";
import type { TeamSave } from "#balance/characters/live-data/team-save";
import type { AuthorId, CharacterId, StoryId, TeamId } from "#balance/characters/types/character-types-enums";
import type {
  Author,
  Character,
  CharacterBalance,
  CharacterIdentity,
  MovePool,
  Story,
  Team,
} from "#balance/characters/types/character-types-objects";
import { initCharacterStates, initCharacters, initTeamSaves } from "#balance/characters/utils/init-custom-registry";
import type { CharacterState } from "#types/character-state";

export const TEAMS: Team[] = initTeams();
export const AUTHORS: Author[] = initAuthors();
export const STORIES: Story[] = initStories();
export const BIOS: string[] = initBios();

export const BALANCES: CharacterBalance[] = initBalances();
export const IDENTITIES: CharacterIdentity[] = initIdentities();
export const MOVE_POOLS: MovePool[] = initMovePools();
export const CHARACTERS: Character[] = initCharacters();

export const CHARACTER_STATES: CharacterState[] = initCharacterStates();
export const TEAM_SAVES: TeamSave[] = initTeamSaves();

function get<T>(array: T[], id: number, arrayName: string) {
  if (array === null || array.length === 0) {
    throw new Error(`The "${arrayName} array has not been initialized.`);
  }
  if (id < 0) {
    throw new Error(`The "${arrayName} array was queried with a negative index: ${id}.`);
  }
  if (id >= array.length) {
    throw new Error(
      `The "${arrayName} array was queried with an index (${id}) not less than its length (${array.length}).`,
    );
  }
  return array[id];
}

export function getTeam(id: TeamId): Team {
  return get(TEAMS, id, "Team");
}

export function getTeammateId(id: CharacterId): CharacterId {
  const team = getTeamFromCharacterId(id);
  return team.leader === id ? team.follower : team.leader;
}

export function getAuthor(id: AuthorId): Author {
  return get(AUTHORS, id, "Author");
}

export function getStory(id: StoryId): Story {
  return get(STORIES, id, "Story");
}

export function getBio(id: CharacterId): string {
  return get(BIOS, id, "Bio");
}

export function getCharacter(id: CharacterId): Character {
  return get(CHARACTERS, id, "Character");
}

export function getCharacterState(id: CharacterId): CharacterState {
  return get(CHARACTER_STATES, id, "CharacterState");
}

export function getTeamSaveFromTeamId(id: TeamId): TeamSave {
  return get(TEAM_SAVES, id, "TeamSave");
}

export function getTeamSaveFromCharacterId(id: CharacterId): TeamSave {
  return getTeamSaveFromTeamId(getTeamFromCharacterId(id).id);
}

export function getIdentity(id: CharacterId): CharacterIdentity {
  return get(IDENTITIES, id, "Identity");
}

export function getBalance(id: CharacterId): CharacterBalance {
  return get(BALANCES, id, "Balance");
}

export function getMovePool(id: CharacterId) {
  return get(MOVE_POOLS, id, "MovePool");
}

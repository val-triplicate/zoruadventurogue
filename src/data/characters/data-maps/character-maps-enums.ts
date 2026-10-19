import { customRegistry } from "#data/characters/live-data/custom-registry";
import type { AuthorId, CharacterId, StoryId, TeamId } from "#data/characters/types/character-types-enums";
import { getFromMapSafely, getFromMapUnsafely } from "#data/characters/utils/character-map-utils";

export const STORY_AUTHORS: Map<StoryId, AuthorId> = new Map();
export const AUTHOR_OVERRIDES: Map<CharacterId, AuthorId> = new Map();
export const STORIES: Map<TeamId, StoryId> = new Map();
export const TEAM_MEMBERS: Map<TeamId, [CharacterId, CharacterId]> = new Map();

export function getAuthorIdFromCharacter(characterId: CharacterId): AuthorId {
  const teamId = customRegistry.getTeamIdFromCharacter(characterId);
  const authorOverrideId = getFromMapSafely(characterId, AUTHOR_OVERRIDES);
  return authorOverrideId || getAuthorIdFromTeam(teamId);
}

export function getAuthorIdFromTeam(teamId: TeamId): AuthorId {
  const storyId = getStoryIdFromTeam(teamId);
  return getFromMapUnsafely(storyId, STORY_AUTHORS, "No Author ID found for Origin ID: " + storyId);
}

export function getStoryIdFromTeam(teamId: TeamId): StoryId {
  return getFromMapUnsafely(teamId, STORIES, "No Origin ID found for Team ID: " + teamId);
}

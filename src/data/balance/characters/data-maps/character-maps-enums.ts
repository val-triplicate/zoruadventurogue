import { getStory } from "#balance/characters/constant-data/character-data-arrays";
import { getTeamFromCharacterId } from "#balance/characters/data-maps/character-maps-objects";
import type { AuthorId, CharacterId } from "#balance/characters/types/character-types-enums";
import { getFromMapSafely } from "#balance/characters/utils/character-map-utils";

export const AUTHOR_OVERRIDES: Map<CharacterId, AuthorId> = new Map();

export function getAuthorIdFromCharacterId(id: CharacterId): AuthorId {
  const authorOverrideId = getFromMapSafely(id, AUTHOR_OVERRIDES);
  return authorOverrideId || getStory(getTeamFromCharacterId(id).story).author;
}

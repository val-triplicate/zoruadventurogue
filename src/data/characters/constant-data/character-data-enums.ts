import {
  AUTHOR_OVERRIDES,
  STORIES,
  STORY_AUTHORS,
  TEAM_MEMBERS,
} from "#data/characters/data-maps/character-maps-enums";
import { AUTHORS } from "#data/characters/data-maps/character-maps-objects";
import { AuthorId, CharacterId, StoryId, TeamId } from "#data/characters/types/character-types-enums";

export function initTeamMembers() {
  setTeamMembers(TeamId.VAPOREON_MAWILE, CharacterId.VM_VAPOREON, CharacterId.VM_MAWILE);
  setTeamMembers(TeamId.ESPEON_SPIDOPS, CharacterId.ES_ESPEON, CharacterId.ES_SPIDOPS);
  setTeamMembers(TeamId.DIA_SILVER, CharacterId.DS_DIA, CharacterId.DS_SILVER);
}

export function initStories() {
  STORIES.set(TeamId.VAPOREON_MAWILE, StoryId.THE_VAPOREON_CYCLE);
  STORIES.set(TeamId.ESPEON_SPIDOPS, StoryId.THE_VAPOREON_CYCLE);
  STORIES.set(TeamId.DIA_SILVER, StoryId.BLIND_PI);
}

export function initStoryAuthors() {
  STORY_AUTHORS.set(StoryId.BLIND_PI, AuthorId.ANGEL);
  STORY_AUTHORS.set(StoryId.MANY_MOONS, AuthorId.GENE);
  STORY_AUTHORS.set(StoryId.MISCELLANEOUS, AuthorId.SHARED);
  STORY_AUTHORS.set(StoryId.RISING_ASHES, AuthorId.REMY);
  STORY_AUTHORS.set(StoryId.THE_VAPOREON_CYCLE, AuthorId.VAL);
  STORY_AUTHORS.set(StoryId.VILLAIN_VENUS, AuthorId.REMY);
  STORY_AUTHORS.set(StoryId.ZORUADVENTURE, AuthorId.ANGEL);
}

export function initAuthorOverrides() {
  AUTHOR_OVERRIDES.set(CharacterId.VM_VAPOREON, AuthorId.ANGEL);
}

export function initAuthors() {
  AUTHORS.set(AuthorId.SHARED, "Multiple Authors");
  AUTHORS.set(AuthorId.ANGEL, "TraumaFox44");
  AUTHORS.set(AuthorId.GENE, "CactusGenome");
  AUTHORS.set(AuthorId.REMY, "Rusty-Eevee");
  AUTHORS.set(AuthorId.VAL, "val-triplicate");
}

function setTeamMembers(teamId: TeamId, charIdA: CharacterId, charIdB: CharacterId): void {
  TEAM_MEMBERS.set(teamId, [charIdA, charIdB]);
}

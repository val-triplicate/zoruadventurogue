import { AuthorId, CharacterId, StoryId, TeamId } from "#balance/characters/types/character-types-enums";
import {
  type Author,
  addAuthor,
  addStory,
  addTeam,
  type Story,
  type Team,
} from "#balance/characters/types/character-types-objects";

export function initAuthors(): Author[] {
  const authors: Author[] = [];
  addAuthor(authors, AuthorId.SHARED, "Multiple Authors", 0x0);
  addAuthor(authors, AuthorId.ANGEL, "TraumaFox44", 0x0);
  addAuthor(authors, AuthorId.GENE, "CactusGenome", 0x0);
  addAuthor(authors, AuthorId.REMY, "Rusty-Eevee", 0x0);
  addAuthor(authors, AuthorId.VAL, "val-triplicate", 0x0);
  return authors;
}

export function initStories(): Story[] {
  const stories: Story[] = [];
  addStory(stories, StoryId.THE_VAPOREON_CYCLE, AuthorId.VAL, "The Vaporeon Cycle", "TVC");
  addStory(stories, StoryId.BLIND_PI, AuthorId.ANGEL, "Blind, P.I.", "TVC");
  addStory(stories, StoryId.MANY_MOONS, AuthorId.GENE, "Many Moons AU", "TVC");
  addStory(stories, StoryId.VILLAIN_VENUS, AuthorId.REMY, "Villain Venus AU", "VVE");
  addStory(stories, StoryId.RISING_ASHES, AuthorId.REMY, "Rising Ashes", "RAS");
  addStory(stories, StoryId.MISCELLANEOUS, AuthorId.SHARED, "Miscellaneous", "MSC");
  addStory(stories, StoryId.ZORUADVENTURE, AuthorId.ANGEL, "ZoruAdventure", "TVC");
  return stories;
}

export function initTeams(): Team[] {
  const teams: Team[] = [];
  addTeam(teams, TeamId.VAPOREON_MAWILE, StoryId.THE_VAPOREON_CYCLE, CharacterId.VM_VAPOREON, CharacterId.VM_MAWILE);
  addTeam(teams, TeamId.DIA_SILVER, StoryId.BLIND_PI, CharacterId.DS_DIA, CharacterId.DS_SILVER);
  addTeam(teams, TeamId.ESPEON_SPIDOPS, StoryId.THE_VAPOREON_CYCLE, CharacterId.ES_ESPEON, CharacterId.ES_SPIDOPS);
  return teams;
}

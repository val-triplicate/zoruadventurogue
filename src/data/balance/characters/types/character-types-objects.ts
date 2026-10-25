import type { AuthorId, CharacterId, StoryId, TeamId } from "#balance/characters/types/character-types-enums";
import { BigGender } from "#data/big-gender";
import { AbilityId } from "#enums/ability-id";
import type { MoveId } from "#enums/move-id";
import { Nature } from "#enums/nature";
import { PokemonType } from "#enums/pokemon-type";
import type { SpeciesId } from "#enums/species-id";

export class Character {
  id: CharacterId;
  identity: CharacterIdentity;
  balance: CharacterBalance;
  movePool: MovePool;

  constructor(id: CharacterId, identity: CharacterIdentity, balance: CharacterBalance, movePool: MovePool) {
    this.id = id;
    this.identity = identity;
    this.balance = balance;
    this.movePool = movePool;
  }
}

export class CharacterIdentity {
  formIndex: number;
  gender: BigGender;
  name: string;
  isShiny: boolean;
  speciesId: SpeciesId;
  author?: AuthorId | undefined;

  constructor(
    speciesId: SpeciesId,
    {
      formIndex = 0,
      gender = new BigGender(),
      name = "",
      isShiny = false,
      author,
    }: {
      formIndex?: number;
      gender?: BigGender;
      isShiny?: boolean;
      name?: string;
      author?: AuthorId | undefined;
    },
  ) {
    this.formIndex = formIndex;
    this.gender = gender;
    this.name = name;
    this.isShiny = isShiny;
    this.speciesId = speciesId;
    this.author = author;
  }
}

export class CharacterBalance {
  stats?: BaseStats | undefined;
  ability: AbilityId;
  passive: AbilityId;
  nature: Nature;
  teraType: PokemonType;

  constructor(stats?: BaseStats, ability?: AbilityId, passive?: AbilityId, nature?: Nature, teraType?: PokemonType) {
    this.stats = stats;
    this.ability = ability ?? AbilityId.NONE;
    this.passive = passive ?? AbilityId.NONE;
    this.nature = nature ?? Nature.DOCILE;
    this.teraType = teraType ?? PokemonType.NORMAL;
  }
}

export type MovePool = [MoveId, MoveId, MoveId, MoveId, MoveId, MoveId, MoveId, MoveId];

export type BaseStats = [number, number, number, number, number, number];

export class Author {
  id: AuthorId;
  name: string;
  color: number;

  constructor(id: AuthorId, name: string, color: number) {
    this.id = id;
    this.name = name;
    this.color = color;
  }
}

export function addAuthor(array: Author[], id: AuthorId, name: string, color: number) {
  array[id] = new Author(id, name, color);
}

export class Story {
  id: StoryId;
  author: AuthorId;
  name: string;
  acronym: string;

  constructor(id: StoryId, author: AuthorId, name: string, acronym: string) {
    this.id = id;
    this.author = author;
    this.name = name;
    this.acronym = acronym;
  }
}

export function addStory(array: Story[], id: StoryId, author: AuthorId, name: string, acronym: string) {
  array[id] = new Story(id, author, name, acronym);
}

export class Team {
  id: TeamId;
  story: StoryId;
  leader: CharacterId;
  follower: CharacterId;
  name: string | undefined;

  constructor(id: TeamId, origin: StoryId, leader: CharacterId, follower: CharacterId, name?: string) {
    this.id = id;
    this.story = origin;
    this.leader = leader;
    this.follower = follower;
    this.name = name;
  }
}

export function addTeam(
  array: Team[],
  id: TeamId,
  story: StoryId,
  leader: CharacterId,
  follower: CharacterId,
  name?: string,
) {
  array[id] = new Team(id, story, leader, follower, name);
}

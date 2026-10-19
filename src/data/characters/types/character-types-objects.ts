import type { AuthorId, CharacterId, StoryId, TeamId } from "#data/characters/types/character-types-enums";
import { AbilityId } from "#enums/ability-id";
import type { MoveId } from "#enums/move-id";
import { Nature } from "#enums/nature";
import { PokemonType } from "#enums/pokemon-type";
import type { Character } from "../constant-data/character-data-objects";

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

export class Team {
  id: TeamId;
  origin: StoryId;
  name: string | undefined;
  leader: CharacterId;
  follower: CharacterId;

  constructor(id: TeamId, origin: StoryId, leader: Character, follower: Character, name?: string) {
    this.id = id;
    this.origin = origin;
    this.name = name;
    this.leader = leader.id;
    this.follower = follower.id;
  }
}

import type { CharacterId, OriginId, TeamId } from "#data/characters/types/character-types-enums";
import { AbilityId } from "#enums/ability-id";
import type { MoveId } from "#enums/move-id";
import { Nature } from "#enums/nature";
import { PokemonType } from "#enums/pokemon-type";
import type { Character } from "../constant-data/character-data-objects";

export class CharacterBalance {
  ability?: AbilityId;
  passive?: AbilityId;
  nature?: Nature;
  teraType?: PokemonType;

  constructor(ability?: AbilityId, passive?: AbilityId, nature?: Nature, teraType?: PokemonType) {
    this.ability = ability ?? AbilityId.NONE;
    this.ability = passive ?? AbilityId.NONE;
    this.nature = nature ?? Nature.DOCILE;
    this.teraType = teraType ?? PokemonType.NORMAL;
  }
}

export type MovePool = [MoveId, MoveId, MoveId, MoveId, MoveId, MoveId, MoveId, MoveId];

export class Team {
  id: TeamId;
  origin: OriginId;
  name: string | undefined;
  leader: CharacterId;
  follower: CharacterId;

  constructor(id: TeamId, origin: OriginId, leader: Character, follower: Character, name?: string) {
    this.id = id;
    this.origin = origin;
    this.name = name;
    this.leader = leader.id;
    this.follower = follower.id;
  }
}

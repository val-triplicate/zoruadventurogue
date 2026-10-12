import type { CharacterIdentity } from "#data/characters/character-identities";
import type { CharacterId } from "#data/characters/types/character-types-enums";
import type { CharacterBalance, MovePool } from "#data/characters/types/character-types-objects";

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

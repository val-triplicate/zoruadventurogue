import type { CharacterBalance } from "#data/characters/character-balance";
import type { CharacterIdentity } from "#data/characters/character-identities";
import type { MovePool } from "#data/moveset";
import type { CharacterId } from "#enums/character-id";

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

import { AUTHOR_OVERRIDES } from "#data/characters/data-maps/character-maps-enums";
import { AuthorId, CharacterId } from "#data/characters/types/character-types-enums";

export function initAuthorOverrides() {
  AUTHOR_OVERRIDES.set(CharacterId.VM_VAPOREON, AuthorId.ANGEL);
}

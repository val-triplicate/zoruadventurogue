import { AUTHOR_OVERRIDES } from "#balance/characters/data-maps/character-maps-enums";
import { AuthorId, CharacterId } from "#balance/characters/types/character-types-enums";

export function initAuthorOverrides() {
  AUTHOR_OVERRIDES.set(CharacterId.VM_VAPOREON, AuthorId.ANGEL);
}

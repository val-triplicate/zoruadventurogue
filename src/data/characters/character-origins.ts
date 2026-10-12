import { BIOS } from "#data/characters/data-maps/character-maps-objects";
import { CharacterId } from "#data/characters/types/character-types-enums";

export function initBios() {
  BIOS.set(CharacterId.VM_VAPOREON, 'What do you get when you cross a fish with "being angry"?');
  BIOS.set(
    CharacterId.VM_MAWILE,
    "What do you get when you cross a blacksmith with another mouth? To be clear, she already had one before you did that.",
  );
  BIOS.set(CharacterId.ES_ESPEON, "Very bad with boundaries.");
  BIOS.set(CharacterId.ES_SPIDOPS, "Very good with boundaries.");
  BIOS.set(CharacterId.DS_DIA, "Missing, presumed dead.");
  BIOS.set(CharacterId.DS_SILVER, "Dead, presumed missing.");
}

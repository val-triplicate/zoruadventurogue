import { BIOS, ORIGINS } from "#data/characters/character-data";
import { type CharacterInput, fromIdSafely } from "#data/characters/character-utils";
import { CharacterId } from "#enums/character-id";
import { OriginId } from "#enums/origin-id";

export function initBios() {
  BIOS.set(CharacterId.VM_VAPOREON, 'What do you get when you cross a fish with "being angry"?');
  BIOS.set(
    CharacterId.VM_MAWILE,
    "What do you get when you cross a blacksmith with another mouth? To be clear, she already has one before you do that.",
  );
  BIOS.set(CharacterId.ES_ESPEON, "Very bad with boundaries.");
  BIOS.set(CharacterId.ES_SPIDOPS, "Very good with boundaries.");
  BIOS.set(CharacterId.DS_DIA, "Missing, presumed dead.");
  BIOS.set(CharacterId.DS_SILVER, "Dead, presumed missing.");
}
export function initOrigins() {
  ORIGINS.set(CharacterId.VM_VAPOREON, OriginId.THE_VAPOREON_CYCLE);
  ORIGINS.set(CharacterId.VM_MAWILE, OriginId.THE_VAPOREON_CYCLE);
  ORIGINS.set(CharacterId.ES_ESPEON, OriginId.THE_VAPOREON_CYCLE);
  ORIGINS.set(CharacterId.ES_SPIDOPS, OriginId.THE_VAPOREON_CYCLE);
  ORIGINS.set(CharacterId.DS_DIA, OriginId.BLIND_PI);
  ORIGINS.set(CharacterId.DS_SILVER, OriginId.BLIND_PI);
}

function getBio(input: CharacterInput): string {
  return fromIdSafely(input, input => BIOS.get(input), "A mysterious soul...");
}

function getOrigin(input: CharacterInput): OriginId {
  return fromIdSafely(input, input => ORIGINS.get(input), OriginId.MISCELLANEOUS);
}

import { CharacterId } from "#balance/characters/types/character-types-enums";

export function initBios(): string[] {
  const bios: string[] = [];
  bios[CharacterId.VM_VAPOREON] = 'What do you get when you cross a fish with "being angry"?';
  bios[CharacterId.VM_MAWILE] =
    "What do you get when you cross a blacksmith with another mouth? To be clear, she already had one before you did that.";
  bios[CharacterId.ES_ESPEON] = "Very bad with boundaries.";
  bios[CharacterId.ES_SPIDOPS] = "Very good with boundaries.";
  bios[CharacterId.DS_DIA] = "Dead, presumed missing.";
  bios[CharacterId.DS_SILVER] = "Missing, presumed dead.";
  return bios;
}

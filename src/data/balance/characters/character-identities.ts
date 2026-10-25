import { speciesDataRegistry } from "#app/global-species-data-registry";
import { getCharacter } from "#balance/characters/constant-data/character-data-arrays";
import { AuthorId, CharacterId } from "#balance/characters/types/character-types-enums";
import { CharacterIdentity } from "#balance/characters/types/character-types-objects";
import { BigGender } from "#data/big-gender";
import { SpeciesId } from "#enums/species-id";
import type { Variant } from "#sprites/variant";

function addIdentity(
  array: CharacterIdentity[],
  id: CharacterId,
  speciesId: SpeciesId,
  gender: BigGender,
  name?: string,
  author?: AuthorId,
): void {
  array[id] = new CharacterIdentity(speciesId, { gender, name: name ?? "", author });
}

export function initIdentities() {
  const identities: CharacterIdentity[] = [];
  addIdentity(identities, CharacterId.VM_VAPOREON, SpeciesId.VAPOREON, BigGender.FEMALE, undefined, AuthorId.ANGEL);
  addIdentity(identities, CharacterId.VM_MAWILE, SpeciesId.MAWILE, BigGender.FEMALE);
  addIdentity(identities, CharacterId.ES_ESPEON, SpeciesId.ESPEON, BigGender.FEMALE);
  addIdentity(identities, CharacterId.ES_SPIDOPS, SpeciesId.SPIDOPS, BigGender.FEMALE);
  addIdentity(identities, CharacterId.DS_DIA, SpeciesId.ESPEON, BigGender.FEMALE, "Dia");
  addIdentity(identities, CharacterId.DS_SILVER, SpeciesId.UMBREON, BigGender.AMAB, "Silver");
  return identities;
}

export function getSpeciesId(id: CharacterId): SpeciesId {
  return getCharacter(id).identity.speciesId;
}

export function getCustomName(id: CharacterId): string {
  return getCharacter(id).identity.name;
}

export function getName(id: CharacterId): string {
  return getCustomName(id) || speciesDataRegistry.getSpecies(getSpeciesId(id)).name;
}

export function getFormIndex(id: CharacterId): number {
  return getCharacter(id).identity.formIndex;
}

export function getGender(id: CharacterId): BigGender {
  return getCharacter(id).identity.gender;
}

export function isShiny(id: CharacterId): boolean {
  return getCharacter(id).identity.isShiny;
}

// noinspection JSUnusedLocalSymbols
export function getVariant(id: CharacterId): Variant {
  return 0;
}

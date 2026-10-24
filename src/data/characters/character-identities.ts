import { speciesRegistry } from "#app/global-species-data-registry";
import { getCharacter } from "#data/characters/constant-data/character-data-arrays";
import { AuthorId, CharacterId } from "#data/characters/types/character-types-enums";
import { type Character, CharacterIdentity } from "#data/characters/types/character-types-objects";
import { Gender } from "#data/gender";
import type { PokemonSpecies } from "#data/pokemon-species";
import { SpeciesId } from "#enums/species-id";

function addIdentity(
  array: CharacterIdentity[],
  id: CharacterId,
  speciesId: SpeciesId,
  gender: Gender,
  name?: string,
  author?: AuthorId,
): void {
  array[id] = new CharacterIdentity(speciesId, { gender, name: name ?? "", author });
}

export function initIdentities() {
  const identities: CharacterIdentity[] = [];
  addIdentity(identities, CharacterId.VM_VAPOREON, SpeciesId.VAPOREON, Gender.FEMALE, undefined, AuthorId.ANGEL);
  addIdentity(identities, CharacterId.VM_MAWILE, SpeciesId.MAWILE, Gender.FEMALE);
  addIdentity(identities, CharacterId.ES_ESPEON, SpeciesId.ESPEON, Gender.FEMALE);
  addIdentity(identities, CharacterId.ES_SPIDOPS, SpeciesId.SPIDOPS, Gender.FEMALE);
  addIdentity(identities, CharacterId.DS_DIA, SpeciesId.ESPEON, Gender.FEMALE, "Dia");
  addIdentity(identities, CharacterId.DS_SILVER, SpeciesId.UMBREON, Gender.NONBINARY, "Silver");
  return identities;
}

export function getSpeciesId(id: CharacterId): SpeciesId {
  return getCharacter(id).identity.speciesId;
}

export function getSpecies(id: CharacterId): PokemonSpecies {
  return speciesRegistry.getSpecies(getSpeciesId(id));
}

export function getName(char: Character): string {
  return getCustomName(char.id) || speciesRegistry.getSpecies(char.identity.speciesId).name;
}

export function getCustomName(id: CharacterId): string {
  return getCharacter(id).identity.name;
}

export function getFormIndex(id: CharacterId): number {
  return getCharacter(id).identity.formIndex || 0;
}

export function getGender(id: CharacterId): Gender {
  return getCharacter(id).identity.gender || Gender.GENDERLESS;
}

export function isShiny(id: CharacterId): boolean {
  return getCharacter(id).identity.isShiny || false;
}

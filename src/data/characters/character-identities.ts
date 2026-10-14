import { speciesRegistry } from "#app/global-species-data-registry";
import { IDENTITIES } from "#data/characters/data-maps/character-maps-objects";
import { CharacterId } from "#data/characters/types/character-types-enums";
import { type CharacterInput, fromCIdUnsafely } from "#data/characters/utils/character-input";
import { Gender } from "#data/gender";
import type { PokemonSpecies } from "#data/pokemon-species";
import { SpeciesId } from "#enums/species-id";

export class CharacterIdentity {
  formIndex: number;
  gender: Gender;
  name: string;
  isShiny: boolean;
  speciesId: SpeciesId;

  constructor(
    speciesId: SpeciesId,
    {
      formIndex = 0,
      gender = Gender.GENDERLESS,
      name = "",
      isShiny = false,
    }: {
      formIndex?: number;
      gender?: Gender;
      isShiny?: boolean;
      name?: string;
    },
  ) {
    this.formIndex = formIndex;
    this.gender = gender;
    this.name = name;
    this.isShiny = isShiny;
    this.speciesId = speciesId;
  }
}

function createIdentity(id: CharacterId, speciesId: SpeciesId, gender: Gender, name?: string): CharacterIdentity {
  const identity = new CharacterIdentity(speciesId, { gender, name: name ?? "" });
  IDENTITIES.set(id, identity);
  return identity;
}

export function initIdentities() {
  createIdentity(CharacterId.VM_VAPOREON, SpeciesId.VAPOREON, Gender.FEMALE);
  createIdentity(CharacterId.VM_MAWILE, SpeciesId.MAWILE, Gender.FEMALE);
  createIdentity(CharacterId.ES_ESPEON, SpeciesId.ESPEON, Gender.FEMALE);
  createIdentity(CharacterId.ES_SPIDOPS, SpeciesId.SPIDOPS, Gender.FEMALE);
  createIdentity(CharacterId.DS_DIA, SpeciesId.ESPEON, Gender.FEMALE, "Dia");
  createIdentity(CharacterId.DS_SILVER, SpeciesId.UMBREON, Gender.NONBINARY, "Silver");
}

export function getSpeciesId(input: CharacterInput): SpeciesId {
  return getIdentity(input).speciesId;
}

export function getSpecies(input: CharacterInput): PokemonSpecies {
  return speciesRegistry.getSpecies(getSpeciesId(input));
}

export function getIdentity(input: CharacterInput): CharacterIdentity {
  return fromCIdUnsafely(input, id => IDENTITIES.get(id));
}

export function getIdentitySafely(id: CharacterId): CharacterIdentity {
  const output = IDENTITIES.get(id);
  if (output) {
    return output;
  }
  throw new Error("Identity for CharacterId not found: " + id);
}

export function getName(input: CharacterInput): string {
  return getIdentity(input).name || speciesRegistry.getSpecies(getSpeciesId(input)).name;
}

export function getFormIndex(input: CharacterInput): number {
  return getIdentity(input).formIndex || 0;
}

export function getGender(input: CharacterInput): Gender {
  return getIdentity(input).gender || Gender.GENDERLESS;
}

export function isShiny(input: CharacterInput): boolean {
  return getIdentity(input).isShiny || false;
}

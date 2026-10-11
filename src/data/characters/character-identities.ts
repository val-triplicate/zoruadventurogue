import { speciesRegistry } from "#app/global-species-data-registry";
import { IDENTITIES } from "#data/characters/character-data";
import { type CharacterInput, fromIdUnsafely } from "#data/characters/character-utils";
import { Gender } from "#data/gender";
import type { PokemonSpecies } from "#data/pokemon-species";
import { CharacterId } from "#enums/character-id";
import { SpeciesId } from "#enums/species-id";

export class CharacterIdentity {
  speciesId: SpeciesId;
  name?: string | undefined;
  gender?: Gender | undefined;
  formIndex?: number | undefined;
  isShiny?: boolean | undefined;
}

export function initIdentities() {
  IDENTITIES.set(CharacterId.VM_VAPOREON, { speciesId: SpeciesId.VAPOREON, gender: Gender.FEMALE });
  IDENTITIES.set(CharacterId.VM_MAWILE, { speciesId: SpeciesId.MAWILE, gender: Gender.FEMALE });
  IDENTITIES.set(CharacterId.ES_ESPEON, { speciesId: SpeciesId.ESPEON, gender: Gender.FEMALE });
  IDENTITIES.set(CharacterId.ES_SPIDOPS, { speciesId: SpeciesId.SPIDOPS, gender: Gender.FEMALE });
  IDENTITIES.set(CharacterId.DS_DIA, { speciesId: SpeciesId.ESPEON, name: "Dia", gender: Gender.FEMALE });
  IDENTITIES.set(CharacterId.DS_SILVER, { speciesId: SpeciesId.UMBREON, name: "Silver", gender: Gender.NONBINARY });
}

export function getSpeciesId(input: CharacterInput): SpeciesId {
  return getIdentity(input).speciesId;
}

export function getSpecies(input: CharacterInput): PokemonSpecies {
  return speciesRegistry.getSpecies(getSpeciesId(input));
}

export function getIdentity(input: CharacterInput): CharacterIdentity {
  return fromIdUnsafely(input, id => IDENTITIES.get(id));
}

export function getIdentitySafely(id: CharacterId): CharacterIdentity {
  const output = IDENTITIES.get(id);
  if (output) {
    return output;
  }
  throw new Error("Identity for CharacterId not found: " + id);
}

export function getName(input: CharacterInput): string {
  return getIdentity(input).name ?? speciesRegistry.getSpecies(getSpeciesId(input)).name;
}

export function getFormIndex(input: CharacterInput): number {
  return getIdentity(input).formIndex ?? 0;
}

export function getGender(input: CharacterInput): Gender {
  return getIdentity(input).gender ?? Gender.GENDERLESS;
}

export function isShiny(input: CharacterInput): boolean {
  return getIdentity(input).isShiny ?? false;
}

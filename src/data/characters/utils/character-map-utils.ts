import type { CharacterId } from "#data/characters/types/character-types-enums";
import { type CharacterInput, unfoldC } from "#data/characters/utils/character-input";

export function getFromMapUnsafely<K, V>(id: K, map: Map<K, V>, errorMessage: string): V {
  const output = map.get(id);
  if (output) {
    return output;
  }
  throw new Error(errorMessage);
}

export function getFromCharacterMapUnsafely<V>(input: CharacterInput, map: Map<CharacterId, V>, vTypeName: string): V {
  return getFromMapUnsafely(unfoldC(input)[0], map, `No ${vTypeName} found for Character ID: ${unfoldC(input)[0]}`);
}

export function getFromMapSafely<K, V>(id: K, map: Map<K, V>): V | undefined {
  return map.get(id);
}

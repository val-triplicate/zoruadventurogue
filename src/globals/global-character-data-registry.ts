import type { CharacterRegistry } from "#data/registries/character-registry";

export let characterRegistry: CharacterRegistry;

export function setCharacterRegistry(registry: CharacterRegistry): void {
  characterRegistry = registry;
}

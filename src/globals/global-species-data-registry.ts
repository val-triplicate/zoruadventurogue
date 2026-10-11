import type { SpeciesRegistry } from "#data/registries/species-registry";

export let speciesRegistry: SpeciesRegistry;

export function setSpeciesDataRegistry(registry: SpeciesRegistry): void {
  speciesRegistry = registry;
}

import type { TeamRegistry } from "#data/registries/team-registry";

export let teamRegistry: TeamRegistry;

export function setTeamRegistry(registry: TeamRegistry): void {
  teamRegistry = registry;
}

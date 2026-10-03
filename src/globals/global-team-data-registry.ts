import type { TeamRegistry } from "#data/team-registry";

export let teamRegistry: TeamRegistry;

export function setTeamRegistry(registry: TeamRegistry): void {
  teamRegistry = registry;
}

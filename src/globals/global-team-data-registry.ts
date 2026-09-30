import type { TeamDataRegistry } from "#data/team-data-registry";

export let teamDataRegistry: TeamDataRegistry;

export function setTeamDataRegistry(registry: TeamDataRegistry): void {
  teamDataRegistry = registry;
}

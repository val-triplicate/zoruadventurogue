import type { TeamMemberDataRegistry } from "#data/team-member-data-registry";

export let teamMemberDataRegistry: TeamMemberDataRegistry;

export function setTeamMemberDataRegistry(registry: TeamMemberDataRegistry): void {
  teamMemberDataRegistry = registry;
}

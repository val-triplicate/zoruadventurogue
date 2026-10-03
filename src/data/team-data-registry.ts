import { setTeamDataRegistry } from "#app/global-team-data-registry";
import { initTeams } from "#balance/custom-teams";
import type { TeamId } from "#enums/team-id";
import type { TeamMemberId } from "#enums/team-member-id";
import type { TeamData, TeamDataMap } from "#types/pokemon-species";

/**
 * The TeamDataRegistry is a singleton class responsible for managing and querying team-related information.
 */
export class TeamDataRegistry {
  private readonly _data: TeamDataMap;

  get data(): TeamDataMap {
    return this._data;
  }

  constructor() {
    this._data = Object.assign({} as TeamDataMap, initTeams());
  }

  public getAllTeams(): TeamData[] {
    return Object.values(this._data);
  }

  public getTeam(id: TeamId): TeamData {
    return this._data[id];
  }

  public getTeamOf(teamMemberId: TeamMemberId): TeamData | undefined {
    for (const team of this.getAllTeams()) {
      if (team.leader === teamMemberId || team.follower === teamMemberId) {
        return team;
      }
    }
  }

  public getTeamIdOf(teamMemberId: TeamMemberId): TeamId | undefined {
    return this.getTeamOf(teamMemberId)?.teamId;
  }
}

export function initTeamDataRegistry(): void {
  setTeamDataRegistry(new TeamDataRegistry());
}

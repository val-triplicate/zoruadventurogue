import { setTeamRegistry } from "#app/global-team-data-registry";
import { initTeams } from "#balance/custom-teams";
import type { CharacterId } from "#enums/character-id";
import type { TeamId } from "#enums/team-id";
import type { Team, TeamDataMap } from "#types/pokemon-species";

export class TeamRegistry {
  private readonly _data: TeamDataMap;

  get data(): TeamDataMap {
    return this._data;
  }

  constructor() {
    this._data = Object.assign({} as TeamDataMap, initTeams());
  }

  public getAllTeams(): Team[] {
    return Object.values(this._data);
  }

  public getTeam(id: TeamId): Team {
    return this._data[id];
  }

  public getTeamOf(teamMemberId: CharacterId): Team | undefined {
    for (const team of this.getAllTeams()) {
      if (team.leader === teamMemberId || team.follower === teamMemberId) {
        return team;
      }
    }
  }

  public getTeamIdOf(teamMemberId: CharacterId): TeamId | undefined {
    return this.getTeamOf(teamMemberId)?.id;
  }

  public isPassiveUnlocked(teamMemberId: CharacterId) {
    return this.getTeamOf(teamMemberId);
  }
}

export function initTeamDataRegistry(): void {
  setTeamRegistry(new TeamRegistry());
}

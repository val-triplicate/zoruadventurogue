import { Origin } from "#enums/origin";
import { TeamId } from "#enums/team-id";
import { TeamMemberId } from "#enums/team-member-id";
import type { TeamDataMap } from "#types/pokemon-species";

export function initTeams(): TeamDataMap {
  const teamData: TeamDataMap = {} as TeamDataMap;

  teamData[TeamId.VAPOREON_MAWILE] = {
    teamId: TeamId.VAPOREON_MAWILE,
    leader: TeamMemberId.VM_VAPOREON,
    follower: TeamMemberId.VM_MAWILE,
    origin: Origin.THE_VAPOREON_CYCLE,
  };
  teamData[TeamId.ESPEON_SPIDOPS] = {
    teamId: TeamId.ESPEON_SPIDOPS,
    leader: TeamMemberId.ES_ESPEON,
    follower: TeamMemberId.ES_SPIDOPS,
    origin: Origin.THE_VAPOREON_CYCLE,
  };
  teamData[TeamId.DIA_SILVER] = {
    teamId: TeamId.DIA_SILVER,
    leader: TeamMemberId.DS_DIA,
    follower: TeamMemberId.DS_SILVER,
    origin: Origin.BLIND_PI,
  };
  return teamData;
}

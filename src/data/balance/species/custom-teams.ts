import { CharacterId } from "#enums/character-id";
import { OriginId } from "#enums/origin-id";
import { TeamId } from "#enums/team-id";
import type { TeamDataMap } from "#types/pokemon-species";

export function initTeams(): TeamDataMap {
  const teamData: TeamDataMap = {} as TeamDataMap;

  teamData[TeamId.VAPOREON_MAWILE] = {
    id: TeamId.VAPOREON_MAWILE,
    leader: CharacterId.VM_VAPOREON,
    follower: CharacterId.VM_MAWILE,
    origin: OriginId.THE_VAPOREON_CYCLE,
  };
  teamData[TeamId.ESPEON_SPIDOPS] = {
    id: TeamId.ESPEON_SPIDOPS,
    leader: CharacterId.ES_ESPEON,
    follower: CharacterId.ES_SPIDOPS,
    origin: OriginId.THE_VAPOREON_CYCLE,
  };
  teamData[TeamId.DIA_SILVER] = {
    id: TeamId.DIA_SILVER,
    leader: CharacterId.DS_DIA,
    follower: CharacterId.DS_SILVER,
    origin: OriginId.BLIND_PI,
  };
  return teamData;
}

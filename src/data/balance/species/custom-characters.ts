import { Gender } from "#data/gender";
import { MoveId } from "#enums/move-id";
import { Nature } from "#enums/nature";
import { SpeciesId } from "#enums/species-id";
import { TeamMemberId } from "#enums/team-member-id";
import type { TeamMemberDataMap } from "#types/pokemon-species";

function addTeamMember(
  map: TeamMemberDataMap,
  teamMemberId: TeamMemberId,
  speciesId: SpeciesId,
  gender?: Gender,
  nature?: Nature,
) {
  const moves = [
    MoveId.SPLASH,
    MoveId.SPLASH,
    MoveId.SPLASH,
    MoveId.SPLASH,
    MoveId.SPLASH,
    MoveId.SPLASH,
    MoveId.SPLASH,
    MoveId.SPLASH,
  ];
  map[teamMemberId] = { teamMemberId, speciesId, gender, nature, moves, abilities: {} };
}

export function initTeamMembers(): TeamMemberDataMap {
  const map: TeamMemberDataMap = {} as TeamMemberDataMap;
  addTeamMember(map, TeamMemberId.VM_VAPOREON, SpeciesId.VAPOREON, Gender.FEMALE, Nature.RASH);
  addTeamMember(map, TeamMemberId.VM_MAWILE, SpeciesId.MAWILE, Gender.FEMALE, Nature.CAREFUL);
  addTeamMember(map, TeamMemberId.ES_ESPEON, SpeciesId.ESPEON, Gender.FEMALE, Nature.HASTY);
  addTeamMember(map, TeamMemberId.ES_SPIDOPS, SpeciesId.SPIDOPS, Gender.FEMALE, Nature.SERIOUS);
  addTeamMember(map, TeamMemberId.DS_DIA, SpeciesId.ESPEON, Gender.FEMALE, Nature.SERIOUS);
  addTeamMember(map, TeamMemberId.DS_SILVER, SpeciesId.UMBREON, Gender.NONBINARY, Nature.SERIOUS);
  return map;
}

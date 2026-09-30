import { Gender } from "#data/gender";
import { Nature } from "#enums/nature";
import { SpeciesId } from "#enums/species-id";
import { TeamMemberId } from "#enums/team-member-id";
import type { TeamMemberDataMapConfig } from "#types/pokemon-species";

export function initTeamMemmbers(): TeamMemberDataMapConfig {
  const teamMemberData: TeamMemberDataMapConfig = {} as TeamMemberDataMapConfig;

  teamMemberData[TeamMemberId.VM_VAPOREON] = {
    gender: Gender.FEMALE,
    species: SpeciesId.VAPOREON,
    nature: Nature.RASH,
  };
  teamMemberData[TeamMemberId.VM_MAWILE] = {
    gender: Gender.FEMALE,
    species: SpeciesId.MAWILE,
    nature: Nature.CAREFUL,
  };
  teamMemberData[TeamMemberId.ES_ESPEON] = {
    gender: Gender.FEMALE,
    species: SpeciesId.ESPEON,
    nature: Nature.HASTY,
  };
  teamMemberData[TeamMemberId.ES_SPIDOPS] = {
    gender: Gender.FEMALE,
    species: SpeciesId.SPIDOPS,
    nature: Nature.SERIOUS,
  };
  teamMemberData[TeamMemberId.DS_DIA] = {
    gender: Gender.FEMALE,
    species: SpeciesId.ESPEON,
    nature: Nature.CALM,
  };
  teamMemberData[TeamMemberId.DS_SILVER] = {
    gender: Gender.NONBINARY,
    species: SpeciesId.UMBREON,
    nature: Nature.LONELY,
  };
  return teamMemberData;
}

import { AUTHOR_OVERRIDES, AUTHORS, ORIGINS, TEAM_MEMBERS } from "#data/characters/data-maps/character-maps-enums";
import { AuthorId, CharacterId, OriginId, TeamId } from "#data/characters/types/character-types-enums";

export function initTeamMembers() {
  setTeamMembers(TeamId.VAPOREON_MAWILE, CharacterId.VM_VAPOREON, CharacterId.VM_MAWILE);
  setTeamMembers(TeamId.ESPEON_SPIDOPS, CharacterId.ES_ESPEON, CharacterId.ES_SPIDOPS);
  setTeamMembers(TeamId.DIA_SILVER, CharacterId.DS_DIA, CharacterId.DS_SILVER);
}

export function initOrigins() {
  ORIGINS.set(TeamId.VAPOREON_MAWILE, OriginId.THE_VAPOREON_CYCLE);
  ORIGINS.set(TeamId.ESPEON_SPIDOPS, OriginId.THE_VAPOREON_CYCLE);
  ORIGINS.set(TeamId.DIA_SILVER, OriginId.BLIND_PI);
}

export function initAuthors() {
  AUTHORS.set(OriginId.BLIND_PI, AuthorId.ANGEL);
  AUTHORS.set(OriginId.MANY_MOONS, AuthorId.GENE);
  AUTHORS.set(OriginId.MISCELLANEOUS, AuthorId.SHARED);
  AUTHORS.set(OriginId.RISING_ASHES, AuthorId.REMY);
  AUTHORS.set(OriginId.THE_VAPOREON_CYCLE, AuthorId.VAL);
  AUTHORS.set(OriginId.VILLAIN_VENUS, AuthorId.REMY);
  AUTHORS.set(OriginId.ZORUADVENTURE, AuthorId.ANGEL);
}

export function initAuthorOverrides() {
  AUTHOR_OVERRIDES.set(CharacterId.VM_VAPOREON, AuthorId.ANGEL);
}

function setTeamMembers(teamId: TeamId, charIdA: CharacterId, charIdB: CharacterId): void {
  TEAM_MEMBERS.set(teamId, [charIdA, charIdB]);
}

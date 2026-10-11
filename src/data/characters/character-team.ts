import type { Character } from "#data/characters/character";
import { getName } from "#data/characters/character-identities";
import type { TeamId } from "#enums/team-id";

export class Team {
  id: TeamId;
  name?: string | undefined;
  leader: Character;
  follower: Character;
}

export function getTeamName(team: Team): string {
  return team.name ?? getName(team.leader) + " & " + getName(team.follower);
}

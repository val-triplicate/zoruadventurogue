import { defaultTeams } from "#app/constants";
import type { TeamId } from "#balance/characters/types/character-types-enums";

export class TeamSave {
  isTeamUnlocked: boolean;
  isAbilityUnlocked: boolean;
  isPassiveUnlocked: boolean;
  runCount: bigint;
  winCount: bigint;

  constructor(id: TeamId) {
    this.isTeamUnlocked = defaultTeams.includes(id);
    this.isAbilityUnlocked = false;
    this.isPassiveUnlocked = false;
    this.runCount = 0n;
    this.winCount = 0n;
  }
}

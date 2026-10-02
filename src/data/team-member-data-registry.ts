import { speciesDataRegistry } from "#app/global-species-data-registry";
import { setTeamMemberDataRegistry } from "#app/global-team-member-data-registry";
import { initTeamMembers } from "#balance/custom-characters";
import type { TeamMemberId } from "#enums/team-member-id";
import type { TeamMemberData, TeamMemberDataMap } from "#types/pokemon-species";
import type { PokemonSpecies, PokemonSpeciesForm } from "./pokemon-species";

/**
 * The TeamMemberDataRegistry is a singleton class responsible for managing and querying team member-related information.
 */
export class TeamMemberDataRegistry {
  private readonly _data: TeamMemberDataMap;

  get data(): TeamMemberDataMap {
    return this._data;
  }

  constructor() {
    this._data = Object.assign({} as TeamMemberDataMap, initTeamMembers());
  }

  public getAllTeamMemberIds(): TeamMemberId[] {
    return this.getAllTeamMembers().flatMap(d => d.teamMemberId);
  }

  public getAllTeamMembers(): TeamMemberData[] {
    return Object.values(this._data);
  }

  public getTeamMember(id: TeamMemberId): TeamMemberData {
    return this._data[id];
  }

  public getName(id: TeamMemberId): string {
    const teamMemberData = this.getTeamMember(id);
    return teamMemberData.name || this.getSpecies(id).name;
  }

  public getSpecies(id: TeamMemberId): PokemonSpecies {
    return speciesDataRegistry.getSpecies(this._data[id].speciesId);
  }

  /**
   * Get either a pokemon species or a specific form of that species.
   * @param speciesId - The {@linkcode SpeciesId} of the species
   * @param form - The `formIndex` or `formKey` of the form to get.
   * @returns The {@linkcode PokemonSpeciesForm} or {@linkcode PokemonSpecies} if the form doesn't exist
   */
  public getPokemonSpeciesForm(teamMemberId: TeamMemberId, form: string | number): PokemonSpeciesForm {
    return speciesDataRegistry.getPokemonSpeciesForm(this.getTeamMember(teamMemberId).speciesId, form);
  }
}

export function initTeamMemberDataRegistry(): void {
  setTeamMemberDataRegistry(new TeamMemberDataRegistry());
}

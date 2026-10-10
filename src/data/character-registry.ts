import { setCharacterRegistry } from "#app/global-character-data-registry";
import { globalScene } from "#app/global-scene";
import { speciesDataRegistry } from "#app/global-species-data-registry";
import { teamRegistry } from "#app/global-team-data-registry";
import { initCharacters } from "#balance/custom-characters";
import type { MoveSet } from "#data/moveset";
import type { CharacterId } from "#enums/character-id";
import { type CharacterPreference, initPreferences } from "#types/character-preference";
import type { Character, CharacterDataMap, PreferenceDataMap } from "#types/pokemon-species";
import type { TeamSaveDataEntry } from "#types/save-data";
import type { PokemonSpecies, PokemonSpeciesForm } from "./pokemon-species";

export class CharacterRegistry {
  private readonly _data: CharacterDataMap;
  private readonly _preference_data: PreferenceDataMap;

  get data(): CharacterDataMap {
    return this._data;
  }

  constructor() {
    const characterDataMap = initCharacters();
    const preferenceDataMap = initPreferences(Object.values(characterDataMap));
    this._data = Object.assign({} as CharacterDataMap, characterDataMap);
    this._preference_data = Object.assign({} as PreferenceDataMap, preferenceDataMap);
  }

  public getAllCharacterIds(): CharacterId[] {
    return this.getAllCharacters().flatMap(d => d.id);
  }

  public getAllCharacters(): Character[] {
    return Object.values(this._data);
  }

  public getCharacter(id: CharacterId): Character {
    return this._data[id];
  }

  public getName(id: CharacterId): string {
    const teamMemberData = this.getCharacter(id);
    return teamMemberData.identity?.name || this.getSpecies(id).name;
  }

  public getSpecies(id: CharacterId): PokemonSpecies {
    return speciesDataRegistry.getSpecies(this._data[id].speciesId);
  }

  public getPokemonSpeciesForm(id: CharacterId, form: string | number): PokemonSpeciesForm {
    return speciesDataRegistry.getPokemonSpeciesForm(this.getCharacter(id).speciesId, form);
  }

  public getSaveData(id: CharacterId): TeamSaveDataEntry | undefined {
    const teamId = teamRegistry.getTeamIdOf(id);
    return teamId && globalScene.gameData.teamSaveData[teamId];
  }

  public getPreferences(id: CharacterId): CharacterPreference {
    return this._preference_data[id];
  }

  public getSelectedMoves(id: CharacterId): MoveSet {
    return this.getPreferences(id).selectedMoves;
  }

  public getUnselectedMoves(id: CharacterId): MoveSet {
    return this.getPreferences(id).unselectedMoves;
  }
}

export function initCharacterRegistry(): void {
  setCharacterRegistry(new CharacterRegistry());
}

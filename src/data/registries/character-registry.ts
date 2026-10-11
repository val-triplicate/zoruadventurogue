import { setCharacterRegistry } from "#app/global-character-data-registry";
import { globalScene } from "#app/global-scene";
import { speciesRegistry } from "#app/global-species-data-registry";
import { teamRegistry } from "#app/global-team-data-registry";
import type { Character } from "#data/characters/character";
import { getSpeciesId } from "#data/characters/character-identities";
import type { MoveSet } from "#data/moveset";
import type { CharacterId } from "#enums/character-id";
import { type CharacterState, initPreferences } from "#types/character-state";
import { type CharacterDataMap, initCharacters, type PreferenceDataMap } from "#types/pokemon-species";
import type { TeamSaveDataEntry } from "#types/save-data";
import type { PokemonSpeciesForm } from "../pokemon-species.ts";

export class CharacterRegistry {
  private readonly _data: CharacterDataMap;
  private readonly _preference_data: PreferenceDataMap;

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

  public getCharacters(ids: CharacterId[]): Character[] {
    return ids.map(id => this._data[id]);
  }

  public getCharacter(id: CharacterId): Character {
    return this._data[id];
  }

  public getPokemonSpeciesForm(id: CharacterId, form: string | number): PokemonSpeciesForm {
    return speciesRegistry.getPokemonSpeciesForm(getSpeciesId(id), form);
  }

  public getSaveData(id: CharacterId): TeamSaveDataEntry | undefined {
    const teamId = teamRegistry.getTeamIdOf(id);
    return teamId && globalScene.gameData.teamSaveData[teamId];
  }

  public getPreferences(id: CharacterId): CharacterState {
    return this._preference_data[id];
  }

  public getActiveMoves(id: CharacterId): MoveSet {
    return this.getPreferences(id).activeMoves;
  }

  public getReserveMoves(id: CharacterId): MoveSet {
    return this.getPreferences(id).reserveMoves;
  }
}

export function initCharacterRegistry(): void {
  setCharacterRegistry(new CharacterRegistry());
}

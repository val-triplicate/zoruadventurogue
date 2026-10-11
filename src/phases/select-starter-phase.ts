import { audioManager } from "#app/global-audio-manager";
import { characterRegistry } from "#app/global-character-data-registry";
import { globalScene } from "#app/global-scene";
import { Phase } from "#app/phase";
import type { Character } from "#data/characters/character";
import { getSpeciesId } from "#data/characters/character-identities";
import { blankMoveSet } from "#data/moveset";
import { UiMode } from "#enums/ui-mode";
import { overrideHeldItems, overrideModifiers } from "#modifiers/modifier";
import { SaveSlotUiMode } from "#ui/save-slot-select-ui-handler";

export class SelectStarterPhase extends Phase {
  public readonly phaseName = "SelectStarterPhase";

  start() {
    super.start();

    audioManager.playBgm("menu");

    globalScene.ui.setMode(UiMode.STARTER_SELECT, () => {
      globalScene.ui.clearText();
      globalScene.ui.setMode(UiMode.SAVE_SLOT, SaveSlotUiMode.SAVE, (slotId: number) => {
        // If clicking cancel, back out to title screen
        if (slotId === -1) {
          globalScene.phaseManager.toTitleScreen();
          this.end();
          return;
        }
        globalScene.sessionSlotId = slotId;
        this.initBattle();
      });
    });
  }

  initBattle() {
    const party = globalScene.getPlayerParty();
    const loadPokemonAssets: Promise<void>[] = [];
    globalScene.getCharacters().forEach((char: Character) => {
      const preferences = characterRegistry.getPreferences(char.id);

      const starterPokemon = globalScene.addPlayerPokemon(
        char.id,
        getSpeciesId(char),
        globalScene.gameMode.getStartingLevel(),
        preferences.abilityIndex,
        preferences.formIndex,
        preferences.gender,
        preferences.shiny,
        preferences.nature,
      );

      starterPokemon.tryPopulateMoveset(preferences.activeMoves || blankMoveSet);
      starterPokemon.passive = preferences.passive;
      starterPokemon.luck = 0;
      starterPokemon.nickname = char.identity?.name;
      starterPokemon.teraType = preferences.tera || starterPokemon.species.type1;
      starterPokemon.setVisible(false);
      party.push(starterPokemon);
      loadPokemonAssets.push(starterPokemon.loadAssets());
    });
    overrideModifiers();
    overrideHeldItems(party[0]);
    Promise.all(loadPokemonAssets).then(() => {
      audioManager.playBgm(undefined, true);
      if (globalScene.gameMode.isClassic) {
        globalScene.gameData.gameStats.classicSessionsPlayed++;
      }
      globalScene.newBattle();
      globalScene.arena.init();
      globalScene.sessionPlayTime = 0;
      globalScene.lastSavePlayTime = 0;
      this.end();
    });
  }
}

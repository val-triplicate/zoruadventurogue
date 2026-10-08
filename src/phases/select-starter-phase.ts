import { audioManager } from "#app/global-audio-manager";
import { characterRegistry } from "#app/global-character-data-registry";
import { globalScene } from "#app/global-scene";
import { Phase } from "#app/phase";
import { UiMode } from "#enums/ui-mode";
import type { PlayerPokemon } from "#field/pokemon";
import { overrideHeldItems, overrideModifiers } from "#modifiers/modifier";
import { blankSelectedMoves } from "#types/save-data";
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
    party.forEach((pokemon: PlayerPokemon) => {
      const char = characterRegistry.getCharacter(pokemon.charId);
      const preferences = characterRegistry.getPreferences(pokemon.charId);

      const starterPokemon = globalScene.addPlayerPokemon(
        pokemon.charId,
        pokemon.species.speciesId,
        globalScene.gameMode.getStartingLevel(),
        pokemon.abilityIndex,
        pokemon.formIndex,
        pokemon.gender,
        pokemon.shiny,
        pokemon.variant,
        pokemon.nature,
      );

      starterPokemon.tryPopulateMoveset(preferences.selectedMoves || blankSelectedMoves);
      starterPokemon.passive = pokemon.passive;
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

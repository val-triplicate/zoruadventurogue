import { audioManager } from "#app/global-audio-manager";
import { globalScene } from "#app/global-scene";
import { Phase } from "#app/phase";
import { getSpeciesId } from "#data/characters/character-identities";
import { getCharacterState } from "#data/characters/constant-data/character-data-arrays";
import type { Character } from "#data/characters/types/character-types-objects";
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
      const characterState = getCharacterState(char.id);

      const starterPokemon = globalScene.addPlayerPokemon(
        char.id,
        getSpeciesId(char.id),
        globalScene.gameMode.getStartingLevel(),
        characterState.ability,
        characterState.formIndex,
        characterState.gender,
        characterState.shiny,
        characterState.nature,
      );

      starterPokemon.tryPopulateMoveset(characterState.activeMoves || blankMoveSet);
      starterPokemon.passive = characterState.passive;
      starterPokemon.luck = 0;
      starterPokemon.nickname = char.identity?.name;
      starterPokemon.teraType = characterState.tera || starterPokemon.species.type1;
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

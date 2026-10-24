import { globalScene } from "#app/global-scene";
import { getCharacterState, getMovePool } from "#data/characters/constant-data/character-data-arrays";
import { allMoves } from "#data/data-lists";
import type { MoveId } from "#enums/move-id";
import { UiMode } from "#enums/ui-mode";
import type { OptionSelectItem, OptionSelectModeConfig } from "#types/ui-types";
import { UiHandlerHelper } from "#ui/handler-helpers/ui-handler-helper";
import type StarterSelectUiHandler from "#ui/starter-select-ui-handler";

export class MoveSelectUiHandlerHelper extends UiHandlerHelper<StarterSelectUiHandler> {
  /**
   * Used to check whether any moves were swapped using the reorder menu, to decide
   * whether a save should be performed or not.
   */
  public hasSwappedMoves = false;

  public startSwapDialogue() {
    const ui = this.owner.getUi();
    this.owner.blockInput = true;
    const showText = () => {
      ui.showText("Select a move to swap out.", null, () => this.promptSelectOldMove());
    };
    ui.setMode(UiMode.STARTER_SELECT).then(showText);
  }

  private promptSelectOldMove(): void {
    const ui = this.getUi();
    this.owner.moveInfoOverlay.show(allMoves[this.owner.activeMoves[0]]);
    ui.setModeWithoutClear(UiMode.OPTION_SELECT, this.oldMoveOptionConfig(this.owner.activeMoves));
    this.owner.blockInput = false;
  }

  private promptSelectNewMove(activeId: MoveId, activeIndex: number) {
    const ui = this.getUi();
    const oldMoveName = allMoves[activeId].name;
    this.owner.blockInput = true;
    ui.setMode(UiMode.STARTER_SELECT).then(() => {
      ui.showText(`$"Select a move to swap with ${oldMoveName}.`, null, () =>
        this.onSelectedNewMove(activeId, activeIndex),
      );
    });
    return true;
  }

  private oldMoveOption(activeId: MoveId, activeIndex: number): OptionSelectItem {
    return {
      label: allMoves[activeId].name,
      handler: () => this.promptSelectNewMove(activeId, activeIndex),
      onHover: () => {
        this.owner.moveInfoOverlay.show(allMoves[activeId]);
      },
    };
  }

  private onSelectedNewMove(activeId: MoveId, activeIndex: number): void {
    const ui = this.getUi();
    const movePool = getMovePool(this.owner.lastCharId);
    const possibleMoves = movePool.filter((poolMoveId: MoveId) => poolMoveId !== activeId);
    this.owner.moveInfoOverlay.show(allMoves[possibleMoves[0]]);
    ui.setModeWithoutClear(UiMode.OPTION_SELECT, this.newMoveOptionConfig(activeId, activeIndex, possibleMoves));
    this.owner.blockInput = false;
  }

  private oldMoveOptionConfig(activeMoves: MoveId[]): OptionSelectModeConfig {
    return {
      options: activeMoves
        .map((oldMoveId: MoveId, activeIndex: number) => this.oldMoveOption(oldMoveId, activeIndex))
        .concat(this.oldMoveCancelOption()),
      maxOptions: 8,
      yOffset: 29,
    } satisfies OptionSelectModeConfig as OptionSelectModeConfig;
  }

  private newMoveOptionConfig(activeId: MoveId, activeIndex: number, possibleMoves: MoveId[]): OptionSelectModeConfig {
    return {
      options: possibleMoves
        .map((newMoveId: MoveId) => this.newMoveOption(activeId, activeIndex, newMoveId))
        .concat(this.newMoveCancelOption()),
      maxOptions: 8,
      yOffset: 29,
    } satisfies OptionSelectModeConfig as OptionSelectModeConfig;
  }

  private oldMoveCancelOption(): OptionSelectItem {
    return {
      label: "Cancel",
      handler: () => this.onCanceledOldMoveSelection(),
      onHover: () => {
        this.owner.moveInfoOverlay.clear();
      },
    };
  }

  private onCanceledOldMoveSelection(): boolean {
    const ui = this.getUi();
    this.owner.moveInfoOverlay.clear();
    this.owner.clearText();
    // Only saved if moves were actually swapped
    if (this.hasSwappedMoves) {
      globalScene.gameData.saveSystem().then(success => {
        if (!success) {
          return globalScene.reset(true);
        }
      });
    }
    ui.setMode(UiMode.STARTER_SELECT);
    return true;
  }

  private newMoveCancelOption(): OptionSelectItem {
    return {
      label: "Cancel",
      handler: () => {
        this.startSwapDialogue();
        return true;
      },
      onHover: () => {
        this.owner.moveInfoOverlay.clear();
      },
    };
  }

  private newMoveOption(activeId: MoveId, activeIndex: number, newMoveId: MoveId): OptionSelectItem {
    return {
      label: allMoves[newMoveId].name,
      handler: () => {
        this.executeSwap(activeIndex, newMoveId, activeId);
        this.startSwapDialogue();
        return true;
      },
      onHover: () => {
        this.owner.moveInfoOverlay.show(allMoves[newMoveId]);
      },
    } satisfies OptionSelectItem as OptionSelectItem;
  }

  /**
   * Puts a move at the requested index in the current highlighted Pokemon's moveset.
   * If the move was already present in the moveset, swap its position with the one at the requested index.
   * @param targetIndex - The index to place the move
   * @param newMove - The move to place in the moveset
   * @param previousMove - The move that was previously in the spot
   */
  private executeSwap(targetIndex: number, newMove: MoveId, previousMove: MoveId): void {
    // The current location (active/reserve, index in that moveset) of the move being activated.
    const activeMoves = this.owner.activeMoves;
    const reserveMoves = this.owner.reserveMoves;
    const currentMoveset = activeMoves.indexOf(newMove) === -1 ? reserveMoves : activeMoves;
    const currentIndex = currentMoveset.indexOf(newMove);
    // Put the previous move where the new move was.
    currentMoveset[currentIndex] = previousMove;
    // Put the new move where it's supposed to go.
    activeMoves[targetIndex] = newMove;
    // Update the saved preferences.
    const characterState = getCharacterState(this.owner.lastCharId);
    characterState.activeMoves = activeMoves;
    characterState.reserveMoves = reserveMoves;

    this.hasSwappedMoves = true;
    this.owner.setCharDetails(this.owner.lastCharId);
  }
}

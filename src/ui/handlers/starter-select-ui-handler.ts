import { PLAYER_PARTY_MAX_SIZE } from "#app/constants";
import { characterRegistry } from "#app/global-character-data-registry";
import { globalScene } from "#app/global-scene";
import { settings } from "#app/global-settings-manager";
import { speciesDataRegistry } from "#app/global-species-data-registry";
import { handleTutorial, Tutorial } from "#app/tutorial";
import { allMoves } from "#data/data-lists";
import { Gender } from "#data/gender";
import type { PokemonSpecies } from "#data/pokemon-species";
import { Button } from "#enums/buttons";
import type { CharacterId } from "#enums/character-id";
import { DexAttr } from "#enums/dex-attr";
import { DropDownColumn } from "#enums/drop-down-column";
import type { MoveId } from "#enums/move-id";
import { PokemonIconAnimMode } from "#enums/pokemon-icon-anim-mode";
import { PokemonType } from "#enums/pokemon-type";
import { TextStyle } from "#enums/text-style";
import { UiMode } from "#enums/ui-mode";
import type { Variant } from "#sprites/variant";
import { getVariantTint } from "#sprites/variant";
import type { Character } from "#types/pokemon-species";
import type { IconProps, MoveSet } from "#types/save-data";
import type { CanCycle } from "#types/starter-select-types";
import type {
  ConfirmModeConfig,
  OptionSelectItem,
  OptionSelectModeConfig,
  TeamMemberSelectCallback,
} from "#types/ui-types";
import { DropDown, DropDownLabel, DropDownOption, DropDownState, DropDownType, SortCriteria } from "#ui/dropdown";
import { FilterBar } from "#ui/filter-bar";
import { MessageUiHandler } from "#ui/message-ui-handler";
import { MoveInfoOverlay } from "#ui/move-info-overlay";
import { PokemonIconAnimHelper } from "#ui/pokemon-icon-anim-helper";
import { ScrollBar } from "#ui/scroll-bar";
import { CharacterContainer } from "#ui/starter-container";
import { StarterSelectInstructionsContainer } from "#ui/starter-select-instructions";
import {
  getIconPropsFromPreferences,
  getStarterDetailsFromPreferences,
  getTeamDataEntry,
  getTeamMemberMoves,
  sortTeamMembers,
} from "#ui/starter-select-ui-utils";
import { StarterSummary } from "#ui/starter-summary";
import { addTextObject } from "#ui/text";
import { addWindow } from "#ui/ui-theme";
import { getLocalizedSpriteKey } from "#utils/common";
import i18next from "i18next";
import type { GameObjects } from "phaser";

const COLUMNS = 9;
const ROWS = 9;
const STARTER_ICONS_CURSOR_X_OFFSET = -3;
const STARTER_ICONS_CURSOR_Y_OFFSET = 1;

// Position of UI elements
const filterBarHeight = 17;
const speciesContainerX = 109; // if team on the RIGHT: 109 / if on the LEFT: 143
const teamWindowX = 285; // if team on the RIGHT: 285 / if on the LEFT: 109
const teamWindowY = 38;
const teamWindowWidth = 34;
const teamWindowHeight = 107;
const randomSelectionWindowHeight = 20;

/**
 * Calculates the starter position for a Pokemon of a given UI index
 * @param index UI index to calculate the starter position of
 * @returns An interface with an x and y property
 */
function calcStarterContainerPosition(index: number): { x: number; y: number } {
  const yOffset = 13;
  const height = 17;
  const x = (index % 9) * 18;
  const y = yOffset + Math.floor(index / 9) * height;

  return { x, y };
}

/**
 * Calculates the y position for the icon of stater pokemon selected for the team
 * @param index index of the Pokemon in the team (0-5)
 * @returns the y position to use for the icon
 */
function calcStarterIconY(index: number) {
  const starterSpacing = teamWindowHeight / 7;
  const firstStarterY = teamWindowY + starterSpacing / 2;
  return Math.round(firstStarterY + starterSpacing * index);
}

/**
 * Finds the index of the team Pokemon closest vertically to the given y position
 * @param y the y position to find closest starter Pokemon
 * @param teamSize how many Pokemon are in the team (0-6)
 * @returns index of the closest Pokemon in the team container
 */
function findClosestStarterIndex(y: number, teamSize = 6): number {
  let smallestDistance = teamWindowHeight;
  let closestStarterIndex = 0;
  for (let i = 0; i < teamSize; i++) {
    const distance = Math.abs(y - (calcStarterIconY(i) - 13));
    if (distance < smallestDistance) {
      closestStarterIndex = i;
      smallestDistance = distance;
    }
  }
  return closestStarterIndex;
}

export class StarterSelectUiHandler extends MessageUiHandler {
  private starterSelectContainer: Phaser.GameObjects.Container;

  private starterContainers: CharacterContainer[] = [];
  public cursorObj: Phaser.GameObjects.Image;
  private starterCursorObjs: Phaser.GameObjects.Image[];
  private starterSelectScrollBar: ScrollBar;
  private scrollCursor: number;
  private filteredCharIds: CharacterId[] = [];
  private lastCharId: CharacterId;

  private partyColumn: GameObjects.Container;
  private partyIcons: Phaser.GameObjects.Sprite[];
  private partyCursorObj: Phaser.GameObjects.Image;
  private partyIconsCursorIndex: number;
  private readonly characters: Character[] = [];
  // TODO: this should be a getter, not an array that needs to be kept in sync with `this.partyStarters`
  public partyTeamMemberIds: CharacterId[] = [];
  /*
  public get partyStarterIds(): StarterSpeciesId[] {
    return this.partyStarters.map(v => v.speciesId) as StarterSpeciesId[];
  }
  */

  private valueLimitLabel: Phaser.GameObjects.Text;
  private startCursorObj: Phaser.GameObjects.NineSlice;
  private randomCursorObj: Phaser.GameObjects.NineSlice;

  private starterSummary: StarterSummary;

  private filterBar: FilterBar;
  private filterMode: boolean;
  private filterBarCursor = 0;

  private instructionsContainer: StarterSelectInstructionsContainer;

  private iconAnimHandler: PokemonIconAnimHelper;

  private starterSelectMessageBox: Phaser.GameObjects.NineSlice;
  private starterSelectMessageBoxContainer: Phaser.GameObjects.Container;
  private moveInfoOverlay: MoveInfoOverlay;

  private selectedMoves: MoveSet;
  private readonly canCycle: CanCycle = {
    ability: false,
    form: false,
    gender: false,
    nature: false,
    shiny: false,
    tera: false,
  };

  //variables to keep track of the dynamically rendered list of instruction prompts for starter select

  private teamMemberSelectCallback: TeamMemberSelectCallback | null;

  /**
   * Used to check whether any moves were swapped using the reorder menu, to decide
   * whether a save should be performed or not.
   */
  private hasSwappedMoves = false;

  protected blockInput = false;
  private oldCursor = -1;

  public override setup(): void {
    const ui = this.getUi();

    /** Scaled canvas height */
    const sHeight = globalScene.scaledCanvas.height;
    /** Scaled canvas width */
    const sWidth = globalScene.scaledCanvas.width;

    this.starterSelectContainer = globalScene.add.container(0, -sHeight).setVisible(false);
    ui.add(this.starterSelectContainer);

    const bgColor = globalScene.add.rectangle(0, 0, sWidth, sHeight, 0x006860).setOrigin(0);

    const starterDexNoLabel = globalScene.add
      .image(6, 14, getLocalizedSpriteKey("summary_dexnb_label"))
      .setOrigin(0, 1); // Pixel text 'No'

    const starterSelectBg = globalScene.add.image(0, 0, "starter_select_bg").setOrigin(0);

    const starterContainerBg = globalScene.add
      .image(speciesContainerX + 1, filterBarHeight + 2, "starter_container_bg")
      .setOrigin(0);

    // Create and initialise filter bar
    this.filterBar = this.setupFilterBar();

    this.iconAnimHandler = new PokemonIconAnimHelper();

    this.partyColumn = this.setupPartyColumn();

    const starterBoxContainer = globalScene.add.container(speciesContainerX + 6, 9); //115

    this.starterSelectScrollBar = new ScrollBar(161, 12, 5, 155, 9);

    starterBoxContainer.add(this.starterSelectScrollBar);

    this.starterCursorObjs = [];
    for (let i = 0; i < 6; i++) {
      const cursorObj = globalScene.add //
        .image(0, 0, "select_cursor_highlight")
        .setVisible(false)
        .setOrigin(0);
      starterBoxContainer.add(cursorObj);
      this.starterCursorObjs.push(cursorObj);
    }

    this.cursorObj = globalScene.add //
      .image(0, 0, "select_cursor")
      .setOrigin(0);

    starterBoxContainer.add(this.cursorObj);

    const allCharacters = characterRegistry.getAllCharacters();

    for (let i = 0; i < 81 && i < allCharacters.length; i++) {
      const pos = calcStarterContainerPosition(i);
      const starterContainer = new CharacterContainer(allCharacters[i]) //
        .setVisible(characterRegistry.getSaveData(allCharacters[i]?.id)?.isTeamUnlocked || false)
        .setPosition(pos.x, pos.y);
      this.iconAnimHandler.addOrUpdate(starterContainer.icon, PokemonIconAnimMode.NONE);
      this.starterContainers.push(starterContainer);
      starterBoxContainer.add(starterContainer);
    }

    this.starterSummary = new StarterSummary(0, 0);
    this.instructionsContainer = new StarterSelectInstructionsContainer(0, 0);
    this.starterSelectMessageBoxContainer = globalScene.add.container(0, sHeight).setVisible(false);
    this.starterSelectMessageBox = addWindow(1, -1, 318, 28).setOrigin(0, 1);
    this.starterSelectMessageBoxContainer.add(this.starterSelectMessageBox);
    this.message = addTextObject(8, 8, "", TextStyle.WINDOW, { maxLines: 2 }).setOrigin(0);
    this.starterSelectMessageBoxContainer.add(this.message);

    // arrow icon for the message box
    this.initPromptSprite(this.starterSelectMessageBoxContainer);

    // add the info overlay last to be the top most ui element and prevent the IVs from overlaying this
    this.moveInfoOverlay = new MoveInfoOverlay({
      top: true,
      x: 1,
      y: globalScene.scaledCanvas.height - MoveInfoOverlay.getHeight() - 29,
    });

    this.starterSelectContainer.add([
      bgColor,
      starterSelectBg,
      starterDexNoLabel,
      starterContainerBg,
      this.partyColumn,
      starterBoxContainer,
      this.starterSummary,
      this.instructionsContainer,
      this.starterSelectMessageBoxContainer,
      this.moveInfoOverlay,
      // Filter bar sits above everything, except the tutorial overlay and message box.
      // Do not put anything below this unless it must appear on top of the filter bar.
      this.filterBar,
    ]);

    this.initTutorialOverlay(this.starterSelectContainer);
    this.starterSelectContainer.bringToTop(this.starterSelectMessageBoxContainer);
  }

  private setupFilterBar(): FilterBar {
    const filterBar = new FilterBar(Math.min(speciesContainerX, teamWindowX), 1, 210, filterBarHeight);

    // type filter
    const typeKeys = Object.keys(PokemonType).filter(v => Number.isNaN(Number(v)));
    const typeOptions: DropDownOption[] = [];
    typeKeys.forEach((type, index) => {
      if (index === 0 || index === 19) {
        return;
      }
      const typeSprite = globalScene.add.sprite(0, 0, getLocalizedSpriteKey("types"));
      typeSprite.setScale(0.5);
      typeSprite.setFrame(type.toLowerCase());
      typeOptions.push(new DropDownOption(index, new DropDownLabel("", typeSprite)));
    });
    filterBar.addFilter(
      DropDownColumn.TYPES,
      i18next.t("filterBar:typeFilter"),
      new DropDown(0, 0, typeOptions, () => this.updateStarters(), DropDownType.HYBRID, 0.5),
    );

    const unlockedFilter = [
      new DropDownOption("UNLOCKED", new DropDownLabel("Unlocked")),
      new DropDownOption("LOCKED", new DropDownLabel("Locked")),
    ];

    filterBar.addFilter(
      DropDownColumn.UNLOCKED,
      i18next.t("filterBar:unlockedFilter"),
      new DropDown(0, 0, unlockedFilter, () => this.updateStarters(), DropDownType.HYBRID),
    );

    // misc filter
    const favoriteLabels = [
      new DropDownLabel(i18next.t("filterBar:favorite"), undefined, DropDownState.OFF),
      new DropDownLabel(i18next.t("filterBar:isFavorite"), undefined, DropDownState.ON),
      new DropDownLabel(i18next.t("filterBar:notFavorite"), undefined, DropDownState.EXCLUDE),
    ];
    const winLabels = [
      new DropDownLabel(i18next.t("filterBar:ribbon"), undefined, DropDownState.OFF),
      new DropDownLabel(i18next.t("filterBar:hasWon"), undefined, DropDownState.ON),
      new DropDownLabel(i18next.t("filterBar:hasNotWon"), undefined, DropDownState.EXCLUDE),
    ];
    const miscOptions = [new DropDownOption("FAVORITE", favoriteLabels), new DropDownOption("WIN", winLabels)];
    filterBar.addFilter(
      DropDownColumn.MISC,
      i18next.t("filterBar:miscFilter"),
      new DropDown(0, 0, miscOptions, () => this.updateStarters(), DropDownType.RADIAL),
    );

    // sort filter
    const sortOptions = [
      new DropDownOption(
        SortCriteria.NUMBER,
        new DropDownLabel(i18next.t("filterBar:sortByNumber"), undefined, DropDownState.ON),
      ),
      new DropDownOption(SortCriteria.NAME, new DropDownLabel(i18next.t("filterBar:sortByName"))),
    ];
    filterBar.addFilter(
      DropDownColumn.SORT,
      i18next.t("filterBar:sortFilter"),
      new DropDown(0, 0, sortOptions, () => this.updateStarters(), DropDownType.SINGLE),
    );

    // Offset the generation filter dropdown to avoid covering the filtered pokemon
    filterBar.offsetHybridFilters();

    return filterBar;
  }

  private setupPartyColumn(): GameObjects.Container {
    const partyColumn = globalScene.add.container(0, 0);

    const starterContainerWindow = addWindow(speciesContainerX, filterBarHeight + 1, 175, 161);

    if (!settings.isLegacyTheme) {
      starterContainerWindow.setVisible(false);
    }

    this.valueLimitLabel = addTextObject(teamWindowX + 17, 150, "0/10", TextStyle.STARTER_VALUE_LIMIT).setOrigin(
      0.5,
      0,
    );

    const startLabel = addTextObject(
      teamWindowX + 17,
      162,
      i18next.t("common:start"),
      TextStyle.TOOLTIP_CONTENT,
    ).setOrigin(0.5, 0);

    this.startCursorObj = globalScene.add
      .nineslice(teamWindowX + 4, 160, "select_cursor", undefined, 26, 15, 6, 6, 6, 6)
      .setVisible(false)
      .setOrigin(0);

    const randomSelectLabel = addTextObject(
      teamWindowX + 17,
      23,
      i18next.t("starterSelectUiHandler:randomize"),
      TextStyle.TOOLTIP_CONTENT,
    ).setOrigin(0.5, 0);

    this.randomCursorObj = globalScene.add
      .nineslice(teamWindowX + 4, 21, "select_cursor", undefined, 26, 15, 6, 6, 6, 6)
      .setVisible(false)
      .setOrigin(0);

    this.partyCursorObj = globalScene.add
      .image(289, 64, "select_gen_cursor")
      .setName("starter-icons-cursor")
      .setVisible(false)
      .setOrigin(0);

    this.partyIcons = [];
    for (let i = 0; i < 6; i++) {
      const icon = globalScene.add
        .sprite(teamWindowX + 7, calcStarterIconY(i), "pokemon_icons_0")
        .setScale(0.5)
        .setOrigin(0)
        .setFrame("unknown");
      this.iconAnimHandler.addOrUpdate(icon, PokemonIconAnimMode.PASSIVE);
      this.partyIcons.push(icon);
    }

    partyColumn.add([
      addWindow(
        teamWindowX,
        teamWindowY - randomSelectionWindowHeight,
        teamWindowWidth,
        randomSelectionWindowHeight,
        true,
      ),
      addWindow(teamWindowX, teamWindowY, teamWindowWidth, teamWindowHeight),
      addWindow(teamWindowX, teamWindowY + teamWindowHeight, teamWindowWidth, teamWindowWidth, true),
      starterContainerWindow,
      this.valueLimitLabel,
      startLabel,
      this.startCursorObj,
      randomSelectLabel,
      this.randomCursorObj,
      this.partyCursorObj,
      ...this.partyIcons,
    ]);

    return partyColumn;
  }

  public override show(args: any[]): boolean {
    this.moveInfoOverlay.clear(); // clear this when removing a menu; the cancel button doesn't seem to trigger this automatically on controllers

    if (args.length > 0 && args[0] instanceof Function) {
      super.show(args);
      this.teamMemberSelectCallback = args[0] as TeamMemberSelectCallback;

      this.starterSelectContainer.setVisible(true);
      this.starterSummary.applyChallengeVisibility();

      this.resetFilters();
      this.updateStarters();

      this.setFilterMode(false);
      this.filterBarCursor = 0;
      this.setCursor(0);

      handleTutorial(Tutorial.STARTER_SELECT);

      return true;
    }

    return false;
  }

  /** Set the selections for all filters to their default starting value */
  public resetFilters(): void {
    this.filterBar.setValsToDefault();
    this.resetCaughtDropdown();
  }

  /** Set default value for the caught dropdown, which only shows caught mons */
  public resetCaughtDropdown(): void {
    const caughtDropDown: DropDown = this.filterBar.getFilter(DropDownColumn.UNLOCKED);

    caughtDropDown.resetToDefault();

    // initial setting, in caught filter, select the options excluding the uncaught option
    for (let i = 0; i < caughtDropDown.options.length; i++) {
      // if the option is not "ALL" or "UNCAUGHT", toggle it
      if (caughtDropDown.options[i].val !== "ALL" && caughtDropDown.options[i].val !== "UNCAUGHT") {
        caughtDropDown.toggleOptionState(i);
      }
    }
  }

  public override showText(
    text: string,
    delay?: number,
    callback?: () => void,
    callbackDelay?: number,
    prompt?: boolean,
    promptDelay?: number,
    moveToTop?: boolean,
  ): void {
    super.showText(text, delay, callback, callbackDelay, prompt, promptDelay);

    const singleLine = text?.indexOf("\n") === -1;

    this.starterSelectMessageBox.setSize(318, singleLine ? 28 : 42);

    if (moveToTop) {
      this.starterSelectMessageBox.setOrigin(0);
      this.starterSelectMessageBoxContainer.setY(0);
      this.message.setY(4);
    } else {
      this.starterSelectMessageBoxContainer.setY(globalScene.scaledCanvas.height);
      this.starterSelectMessageBox.setOrigin(0, 1);
      this.message.setY(singleLine ? -22 : -37);
    }

    this.starterSelectMessageBoxContainer.setVisible(text?.length > 0);
  }

  /**
   * Sets a bounce animation if enabled and the Pokemon has an upgrade
   * @param icon - {@linkcode Phaser.GameObjects.GameObject} to animate
   * @param species - {@linkcode PokemonSpecies} of the icon used to check for upgrades
   * @param startPaused Should this animation be paused after it is added?
   */
  protected setUpgradeAnimation(starter: CharacterContainer): void {
    const icon = starter.icon;
    this.iconAnimHandler.addOrUpdate(icon, PokemonIconAnimMode.NONE);
  }

  private showRandomCursor(): void {
    this.randomCursorObj.setVisible(true);
    this.setNoStarter();
  }

  /** Processes inputs while the filters are open. */
  private processFilterModeInput(button: Button): boolean {
    let success = false;

    const numberOfStarters = this.filteredCharIds.length;
    const numOfRows = Math.ceil(numberOfStarters / COLUMNS);

    switch (button) {
      case Button.CANCEL:
        if (this.filterBar.openDropDown) {
          // CANCEL with a filter menu open > close it
          this.filterBar.toggleDropDown(this.filterBarCursor);
          success = true;
        } else if (!this.filterBar.getFilter(this.filterBar.getColumn(this.filterBarCursor)).hasDefaultValues()) {
          if (this.filterBar.getColumn(this.filterBarCursor) === DropDownColumn.UNLOCKED) {
            this.resetCaughtDropdown();
          } else {
            this.filterBar.resetSelection(this.filterBarCursor);
          }
          this.updateStarters();
          success = true;
        } else if (this.partyTeamMemberIds.length > 0) {
          this.popPartyStarter(this.partyTeamMemberIds.length - 1);
          success = true;
          this.updateInstructions();
        } else {
          this.tryExit();
          success = true;
        }
        break;
      case Button.LEFT:
        if (this.filterBarCursor > 0) {
          success = this.setCursor(this.filterBarCursor - 1);
        } else {
          success = this.setCursor(this.filterBar.numFilters - 1);
        }
        break;
      case Button.RIGHT:
        if (this.filterBarCursor < this.filterBar.numFilters - 1) {
          success = this.setCursor(this.filterBarCursor + 1);
        } else {
          success = this.setCursor(0);
        }
        break;
      case Button.UP:
        if (this.filterBar.openDropDown) {
          success = this.filterBar.decDropDownCursor();
        } else if (this.filterBarCursor === this.filterBar.numFilters - 1) {
          // UP from the last filter, move to start button
          this.setFilterMode(false);
          this.cursorObj.setVisible(false);
          if (this.partyTeamMemberIds.length > 0) {
            this.startCursorObj.setVisible(true);
          } else {
            this.showRandomCursor();
          }
          success = true;
        } else if (numberOfStarters > 0) {
          // UP from filter bar to bottom of Pokemon list
          this.setFilterMode(false);
          this.scrollCursor = Math.max(0, numOfRows - 9);
          this.updateScroll();
          const proportion = (this.filterBarCursor + 0.5) / this.filterBar.numFilters;
          const targetCol = Math.min(8, Math.floor(proportion * 11));
          if (numberOfStarters % 9 > targetCol) {
            this.setCursor(numberOfStarters - (numberOfStarters % 9) + targetCol - this.scrollCursor * 9);
          } else {
            this.setCursor(
              Math.max(numberOfStarters - (numberOfStarters % 9) + targetCol - 9 - this.scrollCursor * 9, 0),
            );
          }
          success = true;
        }
        break;
      case Button.DOWN:
        if (this.filterBar.openDropDown) {
          success = this.filterBar.incDropDownCursor();
        } else if (this.filterBarCursor === this.filterBar.numFilters - 1) {
          // DOWN from the last filter, move to random selection label
          this.setFilterMode(false);
          this.cursorObj.setVisible(false);
          this.showRandomCursor();
          success = true;
        } else if (numberOfStarters > 0) {
          // DOWN from filter bar to top of Pokemon list
          this.setFilterMode(false);
          this.scrollCursor = 0;
          this.updateScroll();
          const proportion = this.filterBarCursor / Math.max(1, this.filterBar.numFilters - 1);
          const targetCol = Math.min(8, Math.floor(proportion * 11));
          this.setCursor(Math.min(targetCol, numberOfStarters - 1));
          success = true;
        }
        break;
      case Button.ACTION:
        if (this.filterBar.openDropDown) {
          this.filterBar.toggleOptionState();
        } else {
          this.filterBar.toggleDropDown(this.filterBarCursor);
        }
        success = true;
        break;
    }

    return success;
  }

  /** Processes inputs while the cursor is on the start button. */
  private processStartCursorInput(button: Button): [success: boolean, error: boolean] {
    let success = false;
    let error = false;

    const numberOfStarters = this.filteredCharIds.length;
    const onScreenFirstIndex = this.scrollCursor * COLUMNS;
    // this is the last starter index on the screen
    const onScreenLastIndex = Math.min(this.filteredCharIds.length - onScreenFirstIndex - 1, ROWS * COLUMNS - 1);
    const onScreenNumberOfRows = Math.ceil(onScreenLastIndex / COLUMNS);

    switch (button) {
      case Button.ACTION:
        if (this.tryStart(true)) {
          success = true;
        } else {
          error = true;
        }
        break;
      case Button.UP:
        // UP from start button: go to pokemon in team if any, otherwise filter
        this.startCursorObj.setVisible(false);
        if (this.partyTeamMemberIds.length > 0) {
          this.partyIconsCursorIndex = this.partyTeamMemberIds.length - 1;
          this.movePartyIconsCursor(this.partyIconsCursorIndex);
        } else {
          // TODO: how can we get here if start button can't be selected? this appears to be redundant
          this.startCursorObj.setVisible(false);
          this.showRandomCursor();
          this.setNoStarter();
        }
        success = true;
        break;
      case Button.DOWN:
        // DOWN from start button: Go to filters
        this.startCursorObj.setVisible(false);
        this.filterBarCursor = Math.max(1, this.filterBar.numFilters - 1);
        this.setFilterMode(true);
        success = true;
        break;
      case Button.LEFT:
        if (numberOfStarters > 0) {
          this.startCursorObj.setVisible(false);
          this.cursorObj.setVisible(true);
          this.setCursor(onScreenLastIndex); // set last column
          success = true;
        }
        break;
      case Button.RIGHT:
        if (numberOfStarters > 0) {
          this.startCursorObj.setVisible(false);
          this.cursorObj.setVisible(true);
          this.setCursor((onScreenNumberOfRows - 1) * 9); // set first column
          success = true;
        }
        break;
    }

    return [success, error];
  }

  /** Processes inputs while the cursor is on the random choice button. */
  private processRandomCursorInput(button: Button): [success: boolean, error: boolean] {
    let success = false;
    let error = false;

    const numberOfStarters = this.filteredCharIds.length;

    switch (button) {
      case Button.ACTION: {
        // This prevents repeated rapid button presses from adding duplicate starters to the party
        this.blockInput = true;

        if (this.partyTeamMemberIds.length >= 6) {
          this.blockInput = false;
          error = true;
          break;
        }

        const validTeamMembers = this.filteredCharIds.filter(charId => {
          return !this.isInParty(charId) && getTeamDataEntry(charId).isTeamUnlocked;
        });
        if (validTeamMembers.length === 0) {
          this.blockInput = false;
          error = true;
          break;
        }

        const randomCharId = validTeamMembers[Math.floor(Math.random() * validTeamMembers.length)];
        const randomCharPreferences = characterRegistry.getPreferences(randomCharId);
        this.setCharacter(randomCharId);

        const props = getIconPropsFromPreferences(randomCharId, randomCharPreferences);
        const speciesForm = characterRegistry.getPokemonSpeciesForm(randomCharId, props.formIndex);
        speciesForm
          .loadAssets(randomCharPreferences.gender, props.formIndex, props.shiny, props.variant, true)
          .then(() => {
            this.addToParty(randomCharId);
            this.getUi().playSelect();
            this.blockInput = false;
          });
        break;
      }
      case Button.UP:
        this.randomCursorObj.setVisible(false);
        this.filterBarCursor = this.filterBar.numFilters - 1;
        this.setFilterMode(true);
        success = true;
        break;
      case Button.DOWN:
        this.randomCursorObj.setVisible(false);
        if (this.partyTeamMemberIds.length > 0) {
          this.partyIconsCursorIndex = 0;
          this.movePartyIconsCursor(this.partyIconsCursorIndex);
        } else {
          this.filterBarCursor = this.filterBar.numFilters - 1;
          this.setFilterMode(true);
        }
        success = true;
        break;
      case Button.LEFT:
        if (numberOfStarters > 0) {
          this.randomCursorObj.setVisible(false);
          this.cursorObj.setVisible(true);
          this.setCursor(Math.min(8, numberOfStarters - 1)); // set last column
          success = true;
        }
        break;
      case Button.RIGHT:
        if (numberOfStarters > 0) {
          this.randomCursorObj.setVisible(false);
          this.cursorObj.setVisible(true);
          this.setCursor(0); // set first column
          success = true;
        }
        break;
    }

    return [success, error];
  }

  /** Processes inputs when pressing one of the cycle buttons. */
  private processCycleButtonsInput(button: Button): boolean {
    switch (button) {
      case Button.CYCLE_SHINY: {
        break;
      }
      case Button.CYCLE_FORM: {
        break;
      }
      case Button.CYCLE_GENDER: {
        break;
      }
      case Button.CYCLE_ABILITY: {
        break;
      }
      case Button.CYCLE_NATURE: {
        break;
      }
      case Button.CYCLE_TERA: {
        break;
      }
    }

    return false;
  }

  /** Processes inputs while the cursor is on one of the party icons. */
  private processPartyIconInput(button: Button): boolean {
    let success = false;

    const numberOfStarters = this.filteredCharIds.length;
    const onScreenLastIndex = Math.min(this.filteredCharIds.length - 1, ROWS * COLUMNS - 1);

    switch (button) {
      case Button.UP:
        if (this.partyIconsCursorIndex === 0) {
          // Up from first Pokemon in the team > go to Random selection
          this.partyCursorObj.setVisible(false);
          this.showRandomCursor();
        } else {
          this.partyIconsCursorIndex--;
          this.movePartyIconsCursor(this.partyIconsCursorIndex);
        }
        success = true;
        break;
      case Button.DOWN:
        if (this.partyIconsCursorIndex <= this.partyTeamMemberIds.length - 2) {
          this.partyIconsCursorIndex++;
          this.movePartyIconsCursor(this.partyIconsCursorIndex);
        } else {
          this.partyCursorObj.setVisible(false);
          this.setNoStarter();
          this.startCursorObj.setVisible(true);
        }
        success = true;
        break;
      case Button.LEFT:
        if (numberOfStarters > 0) {
          // LEFT from team > Go to closest filtered Pokemon
          const closestRowIndex = this.partyIconsCursorIndex + 1;
          this.partyCursorObj.setVisible(false);
          this.cursorObj.setVisible(true);
          this.setCursor(Math.min(closestRowIndex * 9 + 8, onScreenLastIndex));
          success = true;
        } else {
          // LEFT from team and no Pokemon in filter > do nothing
          success = false;
        }
        break;
      case Button.RIGHT:
        if (numberOfStarters > 0) {
          // RIGHT from team > Go to closest filtered Pokemon
          const closestRowIndex = this.partyIconsCursorIndex + 1;
          this.partyCursorObj.setVisible(false);
          this.cursorObj.setVisible(true);
          this.setCursor(Math.min(closestRowIndex * 9, onScreenLastIndex - (onScreenLastIndex % 9)));
          success = true;
        } else {
          // RIGHT from team and no Pokemon in filter > do nothing
          success = false;
        }
        break;
    }

    return success;
  }

  /** Processes inputs from the arrow keys while the cursor is on one of the containers in the box. */
  private processBoxInput(button: Button): boolean {
    let success = false;

    const numberOfStarters = this.filteredCharIds.length;
    const numOfRows = Math.ceil(numberOfStarters / COLUMNS);
    const onScreenFirstIndex = this.scrollCursor * COLUMNS;
    const onScreenLastIndex = Math.min(this.filteredCharIds.length - onScreenFirstIndex - 1, ROWS * COLUMNS - 1);
    const currentRow = Math.floor((onScreenFirstIndex + this.cursor) / COLUMNS);
    const onScreenCurrentRow = Math.floor(this.cursor / COLUMNS);

    switch (button) {
      case Button.UP:
        if (currentRow > 0) {
          if (this.scrollCursor > 0 && currentRow - this.scrollCursor === 0) {
            this.scrollCursor--;
            this.updateScroll();
            this.setCursor(this.cursor);
            success = true;
          } else {
            success = this.setCursor(this.cursor - 9);
          }
          break;
        }

        this.leaveGrid();
        this.filterBarCursor = this.filterBar.getNearestFilter(this.starterContainers[this.cursor]);
        this.setFilterMode(true);
        success = true;
        break;
      case Button.DOWN:
        if (currentRow < numOfRows - 1 && this.cursor + 9 < this.filteredCharIds.length) {
          // This is not the last row of starters

          const movingToLastRow = currentRow === numOfRows - 2;
          const xPos = this.cursor % 9;
          const lastXPosInLastRow = (numberOfStarters - 1) % 9;

          if (currentRow - this.scrollCursor === 8) {
            // This is the last visible row, but there are more rows underneath, so we need to scroll
            this.scrollCursor++;
            this.updateScroll();
            if (movingToLastRow && xPos > lastXPosInLastRow) {
              this.setCursor(onScreenLastIndex - 8 + lastXPosInLastRow);
            } else {
              this.setCursor(this.cursor);
            }
            success = true;
          } else if (movingToLastRow && xPos > lastXPosInLastRow) {
            success = this.setCursor(onScreenLastIndex);
          } else {
            success = this.setCursor(this.cursor + 9);
          }
          break;
        }

        if (numOfRows > 1) {
          // This is the last row, so we wrap around to the first row
          this.scrollCursor = 0;
          this.updateScroll();
          success = this.setCursor(this.cursor % 9);
          break;
        }

        // DOWN from single row of Pokemon > Go to filters
        this.leaveGrid();
        this.filterBarCursor = this.filterBar.getNearestFilter(this.starterContainers[this.cursor]);
        this.setFilterMode(true);
        success = true;
        break;
      case Button.LEFT:
        if (this.cursor % 9 !== 0) {
          success = this.setCursor(this.cursor - 1);
          break;
        }

        // LEFT from filtered Pokemon, on the left edge
        if (onScreenCurrentRow === 0) {
          // from the first row of starters we go to the random selection
          this.leaveGrid();
          this.showRandomCursor();
        } else if (this.partyTeamMemberIds.length === 0) {
          // no starter in team and not on first row > wrap around to the last column
          success = this.setCursor(this.cursor + Math.min(8, onScreenLastIndex - this.cursor));
          break;
        } else if (onScreenCurrentRow < 7) {
          // at least one pokemon in team > for the first 7 rows, go to closest starter
          this.leaveGrid();
          this.partyIconsCursorIndex = findClosestStarterIndex(this.cursorObj.y - 1, this.partyTeamMemberIds.length);
          this.movePartyIconsCursor(this.partyIconsCursorIndex);
        } else {
          // at least one pokemon in team > from the bottom 2 rows, go to start run button
          this.leaveGrid();
          this.startCursorObj.setVisible(true);
        }
        success = true;
        break;
      case Button.RIGHT:
        // is not right edge
        if (this.cursor % 9 < (currentRow < numOfRows - 1 ? 8 : (numberOfStarters - 1) % 9)) {
          success = this.setCursor(this.cursor + 1);
          break;
        }

        // RIGHT from filtered Pokemon, on the right edge
        if (onScreenCurrentRow === 0) {
          // from the first row of starters we go to the random selection
          this.leaveGrid();
          this.showRandomCursor();
        } else if (this.partyTeamMemberIds.length === 0) {
          // no selected starter in team > wrap around to the first column
          success = this.setCursor(this.cursor - Math.min(8, this.cursor % 9));
          break;
        } else if (onScreenCurrentRow < 7) {
          // at least one pokemon in team > for the first 7 rows, go to closest starter
          this.leaveGrid();
          this.partyIconsCursorIndex = findClosestStarterIndex(this.cursorObj.y - 1, this.partyTeamMemberIds.length);
          this.movePartyIconsCursor(this.partyIconsCursorIndex);
        } else {
          // at least one pokemon in team > from the bottom 2 rows, go to start run button
          this.leaveGrid();
          this.startCursorObj.setVisible(true);
        }
        success = true;
        break;
    }
    return success;
  }

  private leaveGrid(): void {
    this.cursorObj.setVisible(false);
    this.stopIconAnimation(this.cursor);
    this.setNoStarter();
  }

  /** Opens the menu and populates its options. */
  private openPokemonMenu(): void {
    const ui = this.getUi();
    const options: OptionSelectItem[] = [];

    const charId = this.lastCharId;
    const preferences = characterRegistry.getPreferences(charId);
    const saveData = characterRegistry.getSaveData(charId);

    let characterContainer: CharacterContainer;

    // this gets the correct pokemon cursor depending on whether you're in the starter screen or the party icons
    if (this.partyCursorObj.visible) {
      // if species is in filtered starters, get the starter container from the filtered starters, it can be undefined if the species is not in the filtered starters
      characterContainer =
        this.starterContainers[this.starterContainers.findIndex(container => container.charId === charId)];
    } else {
      characterContainer = this.starterContainers[this.cursor];
    }

    const [isDupe, removeIndex]: [boolean, number] = this.isInParty(charId);

    if (!isDupe && this.partyTeamMemberIds.length < PLAYER_PARTY_MAX_SIZE) {
      options.push({
        label: i18next.t("starterSelectUiHandler:addToParty"),
        handler: () => {
          ui.setMode(UiMode.STARTER_SELECT);

          if (isDupe) {
            // this should be redundant as there is now a trigger for when a pokemon can't be added to party
            ui.playError();
            return true;
          }

          this.starterCursorObjs[this.partyTeamMemberIds.length]
            .setVisible(true)
            .setPosition(this.cursorObj.x, this.cursorObj.y);
          this.addToParty(charId);
          ui.playSelect();
          return true;
        },
        noSoundEffects: true,
      });
    } else if (isDupe) {
      options.push({
        label: i18next.t("starterSelectUiHandler:removeFromParty"),
        handler: () => {
          this.popPartyStarter(removeIndex);
          ui.setMode(UiMode.STARTER_SELECT);
          return true;
        },
      });
    }

    const starterMoves = getTeamMemberMoves(charId);
    if (starterMoves.length > 1) {
      const showSwapOptions = (moveset: MoveSet) => {
        this.blockInput = true;

        ui.setMode(UiMode.STARTER_SELECT).then(() => {
          ui.showText(i18next.t("starterSelectUiHandler:selectMoveSwapOut"), null, () => {
            this.moveInfoOverlay.show(allMoves[moveset[0]]);

            ui.setModeWithoutClear(UiMode.OPTION_SELECT, {
              options: moveset
                .map((m: MoveId, i: number) => {
                  const option: OptionSelectItem = {
                    label: allMoves[m].name,
                    handler: () => {
                      this.blockInput = true;
                      ui.setMode(UiMode.STARTER_SELECT).then(() => {
                        ui.showText(
                          `${i18next.t("starterSelectUiHandler:selectMoveSwapWith")} ${allMoves[m].name}.`,
                          null,
                          () => {
                            const possibleMoves = starterMoves.filter((sm: MoveId) => sm !== m);
                            this.moveInfoOverlay.show(allMoves[possibleMoves[0]]);

                            ui.setModeWithoutClear(UiMode.OPTION_SELECT, {
                              options: possibleMoves
                                .map(sm => {
                                  // make an option for each available starter move
                                  return {
                                    label: allMoves[sm].name,
                                    handler: () => {
                                      this.switchMoveHandler(i, sm, m);
                                      showSwapOptions(this.selectedMoves!); // TODO: is this bang correct?
                                      return true;
                                    },
                                    onHover: () => {
                                      this.moveInfoOverlay.show(allMoves[sm]);
                                    },
                                  } satisfies OptionSelectItem as OptionSelectItem;
                                })
                                .concat({
                                  label: i18next.t("menu:cancel"),
                                  handler: () => {
                                    showSwapOptions(this.selectedMoves!); // TODO: is this bang correct?
                                    return true;
                                  },
                                  onHover: () => {
                                    this.moveInfoOverlay.clear();
                                  },
                                }),
                              maxOptions: 8,
                              yOffset: 29,
                            } satisfies OptionSelectModeConfig as OptionSelectModeConfig);
                            this.blockInput = false;
                          },
                        );
                      });
                      return true;
                    },
                    onHover: () => {
                      this.moveInfoOverlay.show(allMoves[m]);
                    },
                  };
                  return option;
                })
                .concat({
                  label: i18next.t("menu:cancel"),
                  handler: () => {
                    this.moveInfoOverlay.clear();
                    this.clearText();
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
                  },
                  onHover: () => {
                    this.moveInfoOverlay.clear();
                  },
                }),
              maxOptions: 8,
              yOffset: 29,
            } satisfies OptionSelectModeConfig as OptionSelectModeConfig);
            this.blockInput = false;
          });
        });
      };
      options.push({
        label: i18next.t("starterSelectUiHandler:manageMoves"),
        handler: () => {
          this.hasSwappedMoves = false;
          showSwapOptions(this.selectedMoves!); // TODO: is this bang correct?
          return true;
        },
      });
    }

    if (saveData?.isPassiveUnlocked) {
      // this is for enabling and disabling the passive
      const label = i18next.t(
        preferences.passive ? "starterSelectUiHandler:disablePassive" : "starterSelectUiHandler:enablePassive",
      );
      options.push({
        label,
        handler: () => {
          preferences.passive = true;
          ui.setMode(UiMode.STARTER_SELECT);
          this.setCharDetails(charId);
          return true;
        },
      });
    }
    // if container.favorite is false, show the favorite option
    const isFavorite = preferences?.favorite ?? false;
    if (isFavorite) {
      options.push({
        label: i18next.t("starterSelectUiHandler:removeFromFavorites"),
        handler: () => {
          preferences.favorite = false;
          // if the starter container not exists, it means the species is not in the filtered starters
          if (characterContainer) {
            characterContainer.favoriteIcon.setVisible(preferences.favorite);
          }
          ui.setMode(UiMode.STARTER_SELECT);
          return true;
        },
      });
    } else {
      options.push({
        label: i18next.t("starterSelectUiHandler:addToFavorites"),
        handler: () => {
          preferences.favorite = true;
          // if the starter container not exists, it means the species is not in the filtered starters
          if (characterContainer) {
            characterContainer.favoriteIcon.setVisible(preferences.favorite);
          }
          ui.setMode(UiMode.STARTER_SELECT);
          return true;
        },
      });
    }
    options.push({
      label: i18next.t("menu:cancel"),
      handler: () => {
        ui.setMode(UiMode.STARTER_SELECT);
        return true;
      },
    });
    ui.setModeWithoutClear(UiMode.OPTION_SELECT, { options });
  }

  public override processInput(button: Button): boolean {
    if (this.blockInput) {
      return false;
    }

    const ui = this.getUi();

    let success = false;
    let error = false;

    if (button === Button.SUBMIT) {
      if (this.tryStart(true)) {
        success = true;
      } else {
        error = true;
      }
    } else if (this.filterMode) {
      success = this.processFilterModeInput(button);
    } else if (button === Button.CANCEL) {
      if (this.partyTeamMemberIds.length > 0) {
        this.popPartyStarter(this.partyTeamMemberIds.length - 1);
        success = true;
        this.updateInstructions();
      } else {
        this.tryExit();
        success = true;
      }
    } else if (button === Button.STATS) {
      // if stats button is pressed, go to filter directly
      if (!this.filterMode) {
        this.startCursorObj.setVisible(false);
        this.partyCursorObj.setVisible(false);
        this.filterBarCursor = 0;
        this.setFilterMode(true);
        this.filterBar.toggleDropDown(this.filterBarCursor);
      }
    } else if (this.partyCursorObj.visible) {
      success = this.processPartyIconInput(button);
    } else if (this.startCursorObj.visible) {
      [success, error] = this.processStartCursorInput(button);
    } else if (this.randomCursorObj.visible) {
      [success, error] = this.processRandomCursorInput(button);
    } else if (button === Button.ACTION) {
      const saveData = characterRegistry.getSaveData(this.lastCharId);
      if (!saveData?.isTeamUnlocked) {
        error = true;
      } else if (this.partyTeamMemberIds.length <= 6) {
        this.openPokemonMenu();
        success = true;
      }
    } else if (
      [
        Button.CYCLE_SHINY,
        Button.CYCLE_FORM,
        Button.CYCLE_GENDER,
        Button.CYCLE_ABILITY,
        Button.CYCLE_NATURE,
        Button.CYCLE_TERA,
      ].includes(button)
    ) {
      success = this.processCycleButtonsInput(button);
    } else {
      success = this.processBoxInput(button);
    }

    if (success) {
      ui.playSelect();
    } else if (error) {
      ui.playError();
    }

    return success || error;
  }

  /**
   * Checks whether a given team member is already in the party.
   *
   * @param teamMemberId - The team member to check
   * @returns A tuple with a boolean indicating whether the team member is a duplicate
   * and the index of the team member if it is a duplicate
   */
  private isInParty(teamMemberId: CharacterId): [isDupe: boolean, removeIndex: number] {
    let removeIndex = 0;
    let isDupe = false;
    for (let s = 0; s < this.partyTeamMemberIds.length; s++) {
      if (this.partyTeamMemberIds[s] === teamMemberId) {
        isDupe = true;
        removeIndex = s;
        break;
      }
    }
    return [isDupe, removeIndex];
  }

  private addToParty(id: CharacterId): void {
    const gender = Gender.FEMALE;
    const species = characterRegistry.getSpecies(id);
    const props = getIconPropsFromPreferences(id);
    this.partyIcons[this.partyTeamMemberIds.length].setTexture(
      species.getIconAtlasKey(props.formIndex, props.shiny, props.variant),
    );
    this.partyIcons[this.partyTeamMemberIds.length].setFrame(
      species.getIconId(gender, props.formIndex, props.shiny, props.variant),
    );
    this.checkIconId(
      this.partyIcons[this.partyTeamMemberIds.length],
      species,
      gender,
      props.formIndex,
      props.shiny,
      props.variant,
    );

    this.partyTeamMemberIds.push(id);
    speciesDataRegistry.getPokemonSpeciesForm(species.speciesId, props.formIndex).cry();
    this.updateInstructions();
  }

  private updatePartyIcon(teamMemberId: CharacterId, index: number): void {
    const species = characterRegistry.getSpecies(teamMemberId);
    let { gender, formIndex, shiny, variant } = this.getStarterDexAttrPropsFromPreferences(teamMemberId);
    gender = gender || Gender.NONBINARY;
    this.partyIcons[index]
      .setTexture(species.getIconAtlasKey(formIndex, shiny, variant))
      .setFrame(species.getIconId(gender, formIndex, shiny, variant));
    this.checkIconId(this.partyIcons[index], species, gender, formIndex, shiny, variant);
  }

  /**
   * Puts a move at the requested index in the current highlighted Pokemon's moveset. \
   * If the move was already present in the moveset, swap its position with the one at the requested index.
   * @remarks
   * ⚠️ {@linkcode selectedMoves | this.starterMoveset} **must not be null when this method is called**
   * @param targetIndex - The index to place the move
   * @param newMove - The move to place in the moveset
   * @param previousMove - The move that was previously in the spot
   */
  private switchMoveHandler(targetIndex: number, newMove: MoveId, previousMove: MoveId): void {
    const selectedMoves = this.selectedMoves;
    if (selectedMoves == null) {
      console.warn("Trying to update a non-existing moveset");
      return;
    }

    const existingMoveIndex = selectedMoves.indexOf(newMove);
    selectedMoves[targetIndex] = newMove;
    if (existingMoveIndex !== -1) {
      selectedMoves[existingMoveIndex] = previousMove;
    }

    const preference = characterRegistry.getPreferences(this.lastCharId);
    preference.selectedMoves[existingMoveIndex] = newMove;
    this.hasSwappedMoves = true;
    this.setCharDetails(this.lastCharId);
  }

  protected updateInstructions(): void {
    const saveData = characterRegistry.getSaveData(this.lastCharId);
    this.instructionsContainer.updateInstructions(this.canCycle, saveData?.isTeamUnlocked, this.filterMode);
  }

  protected updateStarters(): void {
    this.scrollCursor = 0;

    this.filterBar.updateFilterLabels();

    this.filterStarters();

    this.starterSelectScrollBar.setTotalRows(Math.max(Math.ceil(this.filteredCharIds.length / 9), 1));
    this.starterSelectScrollBar.setScrollCursor(0);

    const sort = this.filterBar.getVals(DropDownColumn.SORT)[0];
    sortTeamMembers(this.filteredCharIds, sort.val, sort.dir);

    this.updateScroll();

    this.starterContainers.forEach(container => {
      this.setUpgradeAnimation(container);
    });
  }

  private filterStarters(): void {
    this.filteredCharIds = characterRegistry.getAllCharacterIds().filter(id => {
      const char = characterRegistry.getCharacter(id);
      const speciesId = char.speciesId;
      const species = speciesDataRegistry.getSpecies(speciesId);
      const saveData = characterRegistry.getSaveData(id);

      // Type filter
      const fitsType = this.filterBar
        .getVals(DropDownColumn.TYPES)
        .some(type => species.isOfType((type as number) - 1));

      // Unlocked filter
      const isUnlocked = saveData?.isTeamUnlocked || false;
      const fitsUnlocked = this.filterBar.getVals(DropDownColumn.UNLOCKED).some(unlocked => {
        return (unlocked === "UNLOCKED" && isUnlocked) || (unlocked === "LOCKED" && !isUnlocked);
      });

      // Favorite Filter
      const isFavorite = characterRegistry.getPreferences(id).favorite || false;
      const fitsFavorite = this.filterBar.getVals(DropDownColumn.MISC).some(misc => {
        if (misc.val === "FAVORITE" && misc.state === DropDownState.ON) {
          return isFavorite;
        }
        if (misc.val === "FAVORITE" && misc.state === DropDownState.EXCLUDE) {
          return !isFavorite;
        }
        if (misc.val === "FAVORITE" && misc.state === DropDownState.OFF) {
          return true;
        }
        return false;
      });

      return fitsType && fitsUnlocked && fitsFavorite;
    });
  }

  protected updateScroll(): void {
    const onScreenFirstIndex = this.scrollCursor * COLUMNS;

    this.starterSelectScrollBar.setScrollCursor(this.scrollCursor);

    this.starterCursorObjs.forEach(cursor => cursor.setVisible(false));

    this.starterContainers.forEach((container, i) => {
      const offset_i = i + onScreenFirstIndex;
      if (offset_i >= this.filteredCharIds.length) {
        container.setVisible(false);
        return;
      }

      container.setVisible(true);

      const charId = this.filteredCharIds[offset_i];
      const char = characterRegistry.getCharacter(charId);
      const saveData = characterRegistry.getSaveData(charId);
      const species = speciesDataRegistry.getSpeciesFromTeamMemberId(charId);
      const { gender, formIndex, shiny, variant } = this.getStarterDexAttrPropsFromPreferences(charId);

      container.setCharacter(charId, { gender, formIndex, shiny, variant });

      const starterSprite = container.icon;
      starterSprite.setTexture(
        species.getIconAtlasKey(formIndex, shiny, variant),
        container.species.getIconId(gender ?? Gender.NONBINARY, formIndex, shiny, variant),
      );
      container.checkIconId(gender, formIndex, shiny, variant);

      if (saveData?.isTeamUnlocked) {
        container.icon.clearTint();
      } else {
        container.icon.setTint(0);
      }

      // TODO: If next to unlock, set container.icon.setTint(0x808080);

      if (this.partyTeamMemberIds.includes(charId)) {
        this.starterCursorObjs[this.partyTeamMemberIds.indexOf(charId)]
          .setPosition(container.x - 1, container.y + 1)
          .setVisible(true);
      }

      container.label.setVisible(true);
      const variants = char.identity?.variants;
      for (let v = 0; v < 3; v++) {
        const hasVariant = variants?.[v];
        container.shinyIcons[v].setVisible(hasVariant);

        if (!hasVariant) {
          continue;
        }

        let setVariant: Variant = 2;
        if (variants[v] === DexAttr.DEFAULT_VARIANT) {
          setVariant = 0;
        }
        if (variants[v] === DexAttr.VARIANT_2) {
          setVariant = 1;
        }
        container.shinyIcons[v].setTint(getVariantTint(setVariant));
      }

      container.starterPassiveBgs.setVisible(saveData?.isPassiveUnlocked || false);
      container.hiddenAbilityIcon.setVisible(saveData?.isAbilityUnlocked || false);
      container.classicWinIcon.setVisible((saveData?.winCount || 0) > 0).setTexture("champion_ribbon");
      container.favoriteIcon.setVisible(characterRegistry.getPreferences(charId).favorite);
      this.setUpgradeAnimation(container);
    });
  }

  public override setCursor(cursor: number): boolean {
    let changed = false;
    this.oldCursor = this.cursor;

    if (this.filterMode) {
      changed = this.filterBarCursor !== cursor;
      this.filterBarCursor = cursor;
      this.filterBar.setCursor(cursor);
    } else {
      cursor = Math.max(Math.min(this.starterContainers.length - 1, cursor), 0);
      changed = super.setCursor(cursor);

      const pos = calcStarterContainerPosition(cursor);
      this.cursorObj.setPosition(pos.x - 1, pos.y + 1);

      const teamMemberId = this.starterContainers[cursor].charId;

      if (teamMemberId) {
        this.setCharacter(teamMemberId);
        this.updateInstructions();
      } else {
        this.setNoStarter();
      }
    }

    return changed;
  }

  protected setFilterMode(filterMode: boolean): boolean {
    this.cursorObj.setVisible(!filterMode);
    this.filterBar.cursorObj.setVisible(filterMode);

    if (filterMode !== this.filterMode) {
      this.filterMode = filterMode;
      this.setCursor(filterMode ? this.filterBarCursor : this.cursor);
      if (filterMode) {
        this.updateInstructions();
      }
      return true;
    }

    return false;
  }

  private movePartyIconsCursor(index: number): void {
    this.partyCursorObj.setPositionRelative(
      this.partyIcons[index],
      STARTER_ICONS_CURSOR_X_OFFSET,
      STARTER_ICONS_CURSOR_Y_OFFSET,
    );
    if (this.partyTeamMemberIds.length > 0) {
      this.partyCursorObj.setVisible(true);
      this.setPartyStarter(this.partyTeamMemberIds[index]);
    } else {
      this.partyCursorObj.setVisible(false);
      this.setNoStarter();
    }
  }

  /** Remove the current starter, resetting all cursors and stopping the icon animation. */
  // TODO: should call `resetStarterDetails` instead
  private setNoStarter(): void {
    if (this.lastCharId >= 0) {
      //TODO: Relying on `this.oldCursor` to be correct is clunky; find a better solution
      this.stopIconAnimation(this.oldCursor);
    }
    this.starterSummary.setNoStarter();
  }

  /**
   * Changes the current starter.
   *
   * This:
   * - updates all cursors
   * - stops the animation of the previous starter
   * - starts the animation of the new starter
   * - calls other methods which set details for the starter.
   *
   * If setting no starter, call {@linkcode setNoStarter} instead.
   *
   * @param id - the id of the new starter
   */
  private setCharacter(id: CharacterId): void {
    const saveData = characterRegistry.getSaveData(id);

    // Stop animation for the previously selected starter
    if (this.lastCharId && characterRegistry.getSpecies(this.lastCharId)) {
      this.stopIconAnimation(this.oldCursor);
    }

    this.lastCharId = id;

    // Set the cursors, using preferences if possible, default options otherwise
    this.starterSummary.setCharacter(id);

    if (saveData?.isTeamUnlocked) {
      this.setCharDetails(id);
      this.startIconAnimation(this.cursor);
    } else {
      this.resetStarterDetails();
    }
  }

  private setPartyStarter(charId: CharacterId): void {
    this.starterSummary.setCharacter(charId);

    if (characterRegistry.getSaveData(charId)?.isTeamUnlocked) {
      this.setCharDetails(charId);
    }
  }

  /**
   * Starts the icon animation of the container at the given cursor.
   *
   * @param cursor - the index of the container, ranging from 1 to 81.
   */
  protected startIconAnimation(cursor: number): void {
    const icon = this.starterContainers[cursor].icon;
    // Initiates the small up and down idle animation
    this.iconAnimHandler.addOrUpdate(icon, PokemonIconAnimMode.PASSIVE);
  }

  /**
   * Stops the icon animation of the container at the given cursor.
   *
   * @param cursor - the index of the container, ranging from 1 to 81.
   */

  protected stopIconAnimation(cursor: number): void {
    const container = this.starterContainers[cursor];
    if (!container) {
      return;
    }

    const lastStarterIcon = container.icon;
    const teamMemberId = container.charId;
    let { gender, formIndex, shiny, variant } = this.getStarterDexAttrPropsFromPreferences(teamMemberId);
    gender = gender || Gender.NONBINARY;
    this.checkIconId(lastStarterIcon, container.species, gender, formIndex, shiny, variant);
    this.setUpgradeAnimation(container);
  }

  // TODO: check whether this is still necessary
  private resetStarterDetails(): void {
    this.updateInstructions();
  }

  /**
   * Updates all information for the current starter.
   * This should be called every time that preferences are updated.
   *
   * Among other things, it updates the moveset and party information to match the current preferences.
   *
   * @param starterId - the id of the new starter
   * @param save - whether the new details should be saved to local storage.
   */
  private setCharDetails(charId: CharacterId): void {
    const starterDetails = getStarterDetailsFromPreferences(charId);
    const { shiny, variant, gender, formIndex } = starterDetails;

    this.starterSummary.setStarterDetails(charId, starterDetails);

    const [isInParty, partyIndex]: [boolean, number] = this.isInParty(charId);
    if (isInParty) {
      this.updatePartyIcon(charId, partyIndex);
    }

    const currentContainer = this.starterContainers.find(p => p.charId === charId);
    if (currentContainer) {
      const starterSprite = currentContainer.icon;
      const species = characterRegistry.getSpecies(charId);
      starterSprite.setTexture(
        species.getIconAtlasKey(formIndex, shiny, variant),
        species.getIconId(gender, formIndex, shiny, variant),
      );
      currentContainer.checkIconId(gender, formIndex, shiny, variant);
    }

    this.updateInstructions();
  }

  /**
   * Removes a starter from the party.
   *
   * @param index - the index of the starter to remove in the party.
   */
  private popPartyStarter(index: number): void {
    this.partyTeamMemberIds.splice(index, 1);
    this.characters.splice(index, 1);

    for (let s = 0; s < this.partyTeamMemberIds.length; s++) {
      const teamMemberId = this.partyTeamMemberIds[s];
      const species = speciesDataRegistry.getSpeciesFromTeamMemberId(teamMemberId);
      let { gender, formIndex, shiny, variant } = this.getStarterDexAttrPropsFromPreferences(teamMemberId);
      gender = gender || Gender.NONBINARY;
      this.partyIcons[s]
        .setTexture(species.getIconAtlasKey(formIndex, shiny, variant))
        .setFrame(species.getIconId(gender, formIndex, shiny, variant));
      this.checkIconId(this.partyIcons[s], species, gender, formIndex, shiny, variant);
      if (s >= index) {
        this.starterCursorObjs[s]
          .setPosition(this.starterCursorObjs[s + 1].x, this.starterCursorObjs[s + 1].y)
          .setVisible(this.starterCursorObjs[s + 1].visible);
      }
    }
    this.starterCursorObjs[this.partyTeamMemberIds.length].setVisible(false);
    this.partyIcons[this.partyTeamMemberIds.length] //
      .setTexture("pokemon_icons_0")
      .setFrame("unknown");

    if (this.partyCursorObj.visible) {
      if (this.partyIconsCursorIndex === this.partyTeamMemberIds.length) {
        if (this.partyTeamMemberIds.length > 0) {
          this.partyIconsCursorIndex--;
        } else {
          // No more Pokemon selected, go back to filters
          this.partyCursorObj.setVisible(false);
          this.setNoStarter();
          this.filterBarCursor = Math.max(1, this.filterBar.numFilters - 1);
          this.setFilterMode(true);
        }
      }
      this.movePartyIconsCursor(this.partyIconsCursorIndex);
    } else if (this.startCursorObj.visible && this.partyTeamMemberIds.length === 0) {
      // On the start button and no more Pokemon in party
      this.startCursorObj.setVisible(false);
      if (this.filteredCharIds.length > 0) {
        // Back to the first Pokemon if there is one
        this.cursorObj.setVisible(true);
        this.setCursor(this.scrollCursor * 9);
      } else {
        // Back to filters
        this.filterBarCursor = Math.max(1, this.filterBar.numFilters - 1);
        this.setFilterMode(true);
      }
    }
  }

  // TODO: this is always called with `tryStart(true)`, is this param necessary?
  private tryStart(manualTrigger = false): boolean {
    if (this.partyTeamMemberIds.length === 0) {
      return false;
    }

    const ui = this.getUi();

    const cancelStartRun = () => {
      ui.setMode(UiMode.STARTER_SELECT);
      if (!manualTrigger) {
        this.popPartyStarter(this.partyTeamMemberIds.length - 1);
      }
      this.clearText();
    };

    const startRun = () => {
      globalScene.money = globalScene.gameMode.getStartingMoney();
      const starters = this.characters.slice(0);
      ui.setMode(UiMode.STARTER_SELECT);
      const originalStarterSelectCallback = this.teamMemberSelectCallback;
      this.teamMemberSelectCallback = null;
      originalStarterSelectCallback?.(starters);
    };

    const confirmStartOptions: ConfirmModeConfig = {
      yesHandler: startRun,
      noHandler: cancelStartRun,
      yOffset: 29,
    };

    ui.showText(i18next.t("starterSelectUiHandler:confirmStartTeam"), null, () => {
      ui.setModeWithoutClear(UiMode.CONFIRM, confirmStartOptions);
    });
    return true;
  }

  private getStarterDexAttrPropsFromPreferences(id: CharacterId): IconProps {
    return getIconPropsFromPreferences(id);
  }

  public override clearText(): void {
    this.starterSelectMessageBoxContainer.setVisible(false);
    super.clearText();
  }

  /** Attempt to back out of the starter selection screen into the appropriate parent modal */
  protected tryExit(): void {
    this.blockInput = true;
    const ui = this.getUi();

    const cancelExit = () => {
      ui.setMode(UiMode.STARTER_SELECT);
      this.clearText();
      this.blockInput = false;
    };
    const doExit = () => {
      ui.setMode(UiMode.STARTER_SELECT);
      // Non-challenge modes go directly back to title, while challenge modes go to the selection screen.

      globalScene.phaseManager.toTitleScreen();
      this.clearText();
      globalScene.phaseManager.getCurrentPhase().end();
    };
    const options: ConfirmModeConfig = {
      yesHandler: doExit,
      noHandler: cancelExit,
      yOffset: 29,
    };
    ui.showText(i18next.t("starterSelectUiHandler:confirmExit"), null, () => {
      ui.setModeWithoutClear(UiMode.CONFIRM, options);
    });
  }

  public override clear(): void {
    super.clear();

    this.cursor = -1;
    this.oldCursor = -1;
    this.instructionsContainer.hideInstructions();

    this.starterSummary.clear();

    this.starterSelectContainer.setVisible(false);
    this.blockInput = false;

    while (this.partyTeamMemberIds.length > 0) {
      this.popPartyStarter(this.partyTeamMemberIds.length - 1);
    }
  }

  protected checkIconId(
    icon: Phaser.GameObjects.Sprite,
    species: PokemonSpecies,
    gender: Gender,
    formIndex: number,
    shiny: boolean,
    variant: number,
  ): void {
    if (icon.frame.name !== species.getIconId(gender, formIndex, shiny, variant)) {
      icon
        .setTexture(species.getIconAtlasKey(formIndex, false, variant))
        .setFrame(species.getIconId(gender, formIndex, false, variant));
    }
  }

  public override destroy(): void {
    // Without this the reference gets hung up and no startercontainers get GCd
    for (const container of this.starterContainers) {
      container.destroy();
    }
    this.starterContainers = [];
  }
}

import { PLAYER_PARTY_MAX_SIZE } from "#app/constants";
import { eventBus } from "#app/event-bus";
import { globalScene } from "#app/global-scene";
import { settings } from "#app/global-settings-manager";
import { speciesDataRegistry } from "#app/global-species-data-registry";
import { handleTutorial, Tutorial } from "#app/tutorial";
import { getFormIndex, getGender, getSpeciesId, getVariant, isShiny } from "#balance/characters/character-identities";
import {
  CHARACTER_STATES,
  CHARACTERS,
  getBalance,
  getCharacter,
  getCharacterState,
  getTeamSaveFromCharacterId,
} from "#balance/characters/constant-data/character-data-arrays";
import { CharacterId } from "#balance/characters/types/character-types-enums";
import { speciesEggMoves } from "#balance/egg-moves";
import { POKERUS_STARTER_COUNT } from "#balance/starters";
import { allMoves } from "#data/data-lists";
import { Button } from "#enums/buttons";
import { Challenges } from "#enums/challenges";
import { DexAttr } from "#enums/dex-attr";
import { DropDownColumn } from "#enums/drop-down-column";
import { GameModes } from "#enums/game-modes";
import type { MoveId } from "#enums/move-id";
import { PokemonIconAnimMode } from "#enums/pokemon-icon-anim-mode";
import { PokemonType } from "#enums/pokemon-type";
import { TextStyle } from "#enums/text-style";
import { UiMode } from "#enums/ui-mode";
import type { Variant } from "#sprites/variant";
import { getVariantTint } from "#sprites/variant";
import { achvs } from "#system/achv";
import type { SettingsUpdateEventArgs } from "#types/event-bus-types";
import type { AllStarterPreferences, Starter, StarterMoveset } from "#types/save-data";
import type { CanCycle } from "#types/starter-select-types";
import type { StarterSpeciesId } from "#types/starter-species-id";
import type {
  ConfirmModeConfig,
  OptionSelectItem,
  OptionSelectModeConfig,
  StarterSelectCallback,
} from "#types/ui-types";
import { CharacterContainer } from "#ui/character-container";
import { DropDown, DropDownLabel, DropDownOption, DropDownState, DropDownType, SortCriteria } from "#ui/dropdown";
import { FilterBar } from "#ui/filter-bar";
import { MessageUiHandler } from "#ui/message-ui-handler";
import { MoveInfoOverlay } from "#ui/move-info-overlay";
import { PokemonIconAnimHelper } from "#ui/pokemon-icon-anim-helper";
import { ScrollBar } from "#ui/scroll-bar";
import { StarterSelectInstructionsContainer } from "#ui/starter-select-instructions";
import {
  getCharacterMoves,
  getPartyValue,
  getRunValueLimit,
  isCharacterValidForChallenge,
  sortCharacters,
} from "#ui/starter-select-ui-utils";
import { addTextObject, getTextColor } from "#ui/text";
import { addWindow } from "#ui/ui-theme";
import { checkStarterValidForChallenge } from "#utils/challenge-utils";
import { fixedInt, getLocalizedSpriteKey } from "#utils/common";
import { deepCopy, loadStarterPreferences, saveStarterPreferences } from "#utils/data";
import i18next from "i18next";
import type { GameObjects } from "phaser";

import Sprite = Phaser.GameObjects.Sprite;

import { getTeamFromCharacterId } from "#balance/characters/data-maps/character-maps-objects";
import { CharacterSummary } from "#ui/starter-summary";
import { getEnumValues } from "#utils/enums";

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

  private characterContainers: CharacterContainer[] = [];
  public cursorObj: Phaser.GameObjects.Image;
  private starterCursorObjs: Phaser.GameObjects.Image[];
  private pokerusCursorObjs: Phaser.GameObjects.Image[];
  private starterSelectScrollBar: ScrollBar;
  private scrollCursor: number;
  private filteredCharacterIds: CharacterId[] = [];
  private lastCharId: CharacterId;

  private partyColumn: GameObjects.Container;
  private partyIcons: Sprite[];
  private partyCursorObj: Phaser.GameObjects.Image;
  private partyIconsCursorIndex: number;
  private readonly partyStarters: Starter[] = [];
  // TODO: this should be a getter, not an array that needs to be kept in sync with `this.partyStarters`
  public readonly partyCharacterIds: CharacterId[] = [];
  /*
  public get partyStarterIds(): StarterSpeciesId[] {
    return this.partyStarters.map(v => v.speciesId) as StarterSpeciesId[];
  }
  */

  private valueLimitLabel: Phaser.GameObjects.Text;
  private startCursorObj: Phaser.GameObjects.NineSlice;
  private randomCursorObj: Phaser.GameObjects.NineSlice;

  private characterSummary: CharacterSummary;
  private showIvsMode: boolean;

  private filterBar: FilterBar;
  private filterMode: boolean;
  private filterBarCursor = 0;

  private instructionsContainer: StarterSelectInstructionsContainer;

  private iconAnimHandler: PokemonIconAnimHelper;

  private starterSelectMessageBox: Phaser.GameObjects.NineSlice;
  private starterSelectMessageBoxContainer: Phaser.GameObjects.Container;
  private moveInfoOverlay: MoveInfoOverlay;

  private starterMoveset: StarterMoveset | null;
  private readonly canCycle: CanCycle = {
    ability: false,
    form: false,
    gender: false,
    nature: false,
    shiny: false,
    tera: false,
  };

  //variables to keep track of the dynamically rendered list of instruction prompts for starter select

  private starterSelectCallback: StarterSelectCallback | null;

  private starterPreferences: AllStarterPreferences;
  private originalStarterPreferences: AllStarterPreferences;

  /**
   * Used to check whether any moves were swapped using the reorder menu, to decide
   * whether a save should be performed or not.
   */
  private hasSwappedMoves = false;

  protected blockInput = false;
  private allowTera: boolean;
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

    this.pokerusCursorObjs = [];
    for (let i = 0; i < POKERUS_STARTER_COUNT; i++) {
      const cursorObj = globalScene.add //
        .image(0, 0, "select_cursor_pokerus")
        .setVisible(false)
        .setOrigin(0);
      starterBoxContainer.add(cursorObj);
      this.pokerusCursorObjs.push(cursorObj);
    }

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

    for (let i = 0; i < 81 && i < CHARACTERS.length; i++) {
      const pos = calcStarterContainerPosition(i);
      const starterContainer = new CharacterContainer(getCharacter(i)) //
        .setVisible(getTeamSaveFromCharacterId(i).isTeamUnlocked)
        .setPosition(pos.x, pos.y);
      this.iconAnimHandler.addOrUpdate(starterContainer.icon, PokemonIconAnimMode.NONE);
      this.characterContainers.push(starterContainer);
      starterBoxContainer.add(starterContainer);
    }

    this.characterSummary = new CharacterSummary(0, 0);

    this.instructionsContainer = new StarterSelectInstructionsContainer(0, 0);

    this.starterSelectMessageBoxContainer = globalScene.add.container(0, sHeight).setVisible(false);

    this.starterSelectMessageBox = addWindow(1, -1, 318, 28) //
      .setOrigin(0, 1);
    this.starterSelectMessageBoxContainer.add(this.starterSelectMessageBox);

    this.message = addTextObject(8, 8, "", TextStyle.WINDOW, { maxLines: 2 }) //
      .setOrigin(0);
    this.starterSelectMessageBoxContainer.add(this.message);

    this.initNameBox(this.starterSelectMessageBoxContainer, 8);

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
      this.characterSummary,
      this.instructionsContainer,
      this.starterSelectMessageBoxContainer,
      this.moveInfoOverlay,
      // Filter bar sits above everything, except the tutorial overlay and message box.
      // Do not put anything below this unless it must appear on top of the filter bar.
      this.filterBar,
    ]);

    this.initTutorialOverlay(this.starterSelectContainer);
    this.starterSelectContainer.bringToTop(this.starterSelectMessageBoxContainer);

    eventBus.on("settings/update/success", ({ key, value }: SettingsUpdateEventArgs) => {});
  }

  private setupFilterBar(): FilterBar {
    const filterBar = new FilterBar(Math.min(speciesContainerX, teamWindowX), 1, 210, filterBarHeight);

    // gen filter
    const genOptions: DropDownOption[] = Array.from(
      { length: 9 },
      (_, i) => new DropDownOption(i + 1, new DropDownLabel(i18next.t(`starterSelectUiHandler:gen${i + 1}`))),
    );
    const genDropDown: DropDown = new DropDown(0, 0, genOptions, () => this.updateStarters(), DropDownType.HYBRID);
    filterBar.addFilter(DropDownColumn.GEN, i18next.t("filterBar:genFilter"), genDropDown);

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

    const unlockedOptions = [
      new DropDownOption("LOCKED", new DropDownLabel(i18next.t("filterBar:locked"))),
      new DropDownOption("UNLOCKED", new DropDownLabel(i18next.t("filterBar:unlocked"))),
    ];

    filterBar.addFilter(
      DropDownColumn.UNLOCKED,
      i18next.t("filterBar:unlockedFilter"),
      new DropDown(0, 0, unlockedOptions, () => this.updateStarters(), DropDownType.HYBRID),
    );

    // passive filter
    const passiveLabels = [
      new DropDownLabel(i18next.t("filterBar:passive"), undefined, DropDownState.OFF),
      new DropDownLabel(i18next.t("filterBar:passiveUnlocked"), undefined, DropDownState.ON),
      new DropDownLabel(i18next.t("filterBar:passiveLocked"), undefined, DropDownState.EXCLUDE),
    ];
    const hiddenAbilityLabels = [
      new DropDownLabel(i18next.t("filterBar:hiddenAbility"), undefined, DropDownState.OFF),
      new DropDownLabel(i18next.t("filterBar:hasHiddenAbility"), undefined, DropDownState.ON),
      new DropDownLabel(i18next.t("filterBar:noHiddenAbility"), undefined, DropDownState.EXCLUDE),
    ];

    const unlocksOptions = [
      new DropDownOption("PASSIVE", passiveLabels),
      new DropDownOption("HIDDEN ABILITY", hiddenAbilityLabels),
    ];

    filterBar.addFilter(
      DropDownColumn.UNLOCKS,
      i18next.t("filterBar:unlocksFilter"),
      new DropDown(0, 0, unlocksOptions, () => this.updateStarters(), DropDownType.RADIAL),
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
        SortCriteria.SPECIES_ID,
        new DropDownLabel(i18next.t("filterBar:sortByNumber"), undefined, DropDownState.ON),
      ),
      new DropDownOption(SortCriteria.COST, new DropDownLabel(i18next.t("filterBar:sortByCost"))),
      new DropDownOption(SortCriteria.CANDY, new DropDownLabel(i18next.t("filterBar:sortByCandies"))),
      new DropDownOption(SortCriteria.IV, new DropDownLabel(i18next.t("filterBar:sortByIVs"))),
      new DropDownOption(SortCriteria.SPECIES_NAME, new DropDownLabel(i18next.t("filterBar:sortByName"))),
      new DropDownOption(SortCriteria.CAUGHT, new DropDownLabel(i18next.t("filterBar:sortByNumCaught"))),
      new DropDownOption(SortCriteria.HATCHED, new DropDownLabel(i18next.t("filterBar:sortByNumHatched"))),
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

    this.allowTera = Object.hasOwn(globalScene.gameData.achvUnlocks, achvs.TERASTALLIZE.id);

    if (args.length > 0 && args[0] instanceof Function) {
      super.show(args);
      this.starterSelectCallback = args[0] as StarterSelectCallback;

      this.starterSelectContainer.setVisible(true);

      this.starterPreferences = loadStarterPreferences();
      // Deep copy the JSON (avoid re-loading from disk)
      this.originalStarterPreferences = deepCopy(this.starterPreferences);

      this.characterSummary.applyChallengeVisibility();

      this.resetFilters();
      this.updateStarters();

      this.setFilterMode(false);
      this.filterBarCursor = 0;
      this.setCursor(0);
      this.tryUpdateValue(0);

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

    this.nameBoxContainer?.setY(this.message.y - 16);

    this.starterSelectMessageBoxContainer.setVisible(text?.length > 0);
  }

  protected setUpgradeAnimation(container: CharacterContainer): void {
    this.iconAnimHandler.addOrUpdate(container.icon, PokemonIconAnimMode.NONE);
  }

  private showRandomCursor(): void {
    this.randomCursorObj.setVisible(true);
    this.setNoStarter();
  }

  /** Processes inputs while the filters are open. */
  private processFilterModeInput(button: Button): boolean {
    let success = false;

    const numberOfCharacters = this.filteredCharacterIds.length;
    const numOfRows = Math.ceil(numberOfCharacters / COLUMNS);

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
        } else if (this.showIvsMode) {
          this.toggleShowIvsMode(false);
          success = true;
        } else if (this.partyCharacterIds.length > 0) {
          this.popLastTeam();
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
          if (this.partyCharacterIds.length > 0) {
            this.startCursorObj.setVisible(true);
          } else {
            this.showRandomCursor();
          }
          success = true;
        } else if (numberOfCharacters > 0) {
          // UP from filter bar to bottom of Pokemon list
          this.setFilterMode(false);
          this.scrollCursor = Math.max(0, numOfRows - 9);
          this.updateScroll();
          const proportion = (this.filterBarCursor + 0.5) / this.filterBar.numFilters;
          const targetCol = Math.min(8, Math.floor(proportion * 11));
          if (numberOfCharacters % 9 > targetCol) {
            this.setCursor(numberOfCharacters - (numberOfCharacters % 9) + targetCol - this.scrollCursor * 9);
          } else {
            this.setCursor(
              Math.max(numberOfCharacters - (numberOfCharacters % 9) + targetCol - 9 - this.scrollCursor * 9, 0),
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
        } else if (numberOfCharacters > 0) {
          // DOWN from filter bar to top of Pokemon list
          this.setFilterMode(false);
          this.scrollCursor = 0;
          this.updateScroll();
          const proportion = this.filterBarCursor / Math.max(1, this.filterBar.numFilters - 1);
          const targetCol = Math.min(8, Math.floor(proportion * 11));
          this.setCursor(Math.min(targetCol, numberOfCharacters - 1));
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

    const numberOfCharacters = this.filteredCharacterIds.length;
    const onScreenFirstIndex = this.scrollCursor * COLUMNS;
    // this is the last starter index on the screen
    const onScreenLastIndex = Math.min(this.filteredCharacterIds.length - onScreenFirstIndex - 1, ROWS * COLUMNS - 1);
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
        if (this.partyCharacterIds.length > 0) {
          this.partyIconsCursorIndex = this.partyCharacterIds.length - 1;
          this.movePartyIconsCursor(this.partyIconsCursorIndex);
        } else {
          // TODO: how can we get here if start button can't be selected? this appears to be redundant
          this.startCursorObj.setVisible(false);
          this.showRandomCursor();
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
        if (numberOfCharacters > 0) {
          this.startCursorObj.setVisible(false);
          this.cursorObj.setVisible(true);
          this.setCursor(onScreenLastIndex); // set last column
          success = true;
        }
        break;
      case Button.RIGHT:
        if (numberOfCharacters > 0) {
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

    const numberOfCharacters = this.filteredCharacterIds.length;

    switch (button) {
      case Button.ACTION: {
        // This prevents repeated rapid button presses from adding duplicate starters to the party
        this.blockInput = true;

        if (this.partyCharacterIds.length >= 6) {
          this.blockInput = false;
          error = true;
          break;
        }

        const currentPartyValue = getPartyValue(this.partyCharacterIds);
        const validCharacters = this.filteredCharacterIds.filter(charId => {
          const [isDupe] = this.isInParty(charId);
          const starterCost = 0;
          const isValidForChallenge = checkStarterValidForChallenge(charId, this.isPartyValid());
          const isUnlocked = getTeamSaveFromCharacterId(charId).isTeamUnlocked;
          return !isDupe && isValidForChallenge && currentPartyValue + starterCost <= getRunValueLimit() && isUnlocked;
        });
        if (validCharacters.length === 0) {
          this.blockInput = false;
          error = true;
          break;
        }

        const randomCharId = validCharacters[Math.floor(Math.random() * validCharacters.length)];
        this.setCharacter(randomCharId, false);
        const starterCost = 0;
        const speciesForm = speciesDataRegistry.getPokemonSpeciesFormFromCharacterId(randomCharId);
        speciesForm.loadAssetsFromCharacterId(randomCharId, true).then(() => {
          if (this.tryUpdateValue(starterCost, true)) {
            this.addToParty(randomCharId, true);
            this.getUi().playSelect();
          }

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
        if (this.partyCharacterIds.length > 0) {
          this.partyIconsCursorIndex = 0;
          this.movePartyIconsCursor(this.partyIconsCursorIndex);
        } else {
          this.filterBarCursor = this.filterBar.numFilters - 1;
          this.setFilterMode(true);
        }
        success = true;
        break;
      case Button.LEFT:
        if (numberOfCharacters > 0) {
          this.randomCursorObj.setVisible(false);
          this.cursorObj.setVisible(true);
          this.setCursor(Math.min(8, numberOfCharacters - 1)); // set last column
          success = true;
        }
        break;
      case Button.RIGHT:
        if (numberOfCharacters > 0) {
          this.randomCursorObj.setVisible(false);
          this.cursorObj.setVisible(true);
          this.setCursor(0); // set first column
          success = true;
        }
        break;
    }

    return [success, error];
  }

  /** Update the preferences for the form index for a given species ID. */
  private setNewFormIndex(speciesId: StarterSpeciesId, formIndex: number): void {
    this.starterPreferences[speciesId] ??= {};
    this.originalStarterPreferences[speciesId] ??= {};
    this.starterPreferences[speciesId].formIndex = formIndex;
    this.originalStarterPreferences[speciesId].formIndex = formIndex;
    // Updating tera type for new form
    this.setNewTeraType(speciesId, speciesDataRegistry.getSpecies(speciesId).forms[formIndex].type1);
    // Updating gender for gendered forms
    if (speciesDataRegistry.getSpecies(speciesId)?.forms?.find(f => f.formKey === "female")) {
      const newFemale = formIndex === 1;
      if (this.starterPreferences[speciesId].female !== newFemale) {
        this.setNewGender(speciesId, newFemale);
      }
    }
  }

  /** Update the preferences for the gender for a given species ID. */
  private setNewGender(speciesId: StarterSpeciesId, female: boolean): void {
    this.starterPreferences[speciesId] ??= {};
    this.originalStarterPreferences[speciesId] ??= {};
    this.starterPreferences[speciesId].female = female;
    this.originalStarterPreferences[speciesId].female = female;
    // Updating form for gendered forms
    if (speciesDataRegistry.getSpecies(speciesId)?.forms?.find(f => f.formKey === "female")) {
      const newFormIndex = female ? 1 : 0;
      if (this.starterPreferences[speciesId].formIndex !== newFormIndex) {
        this.setNewFormIndex(speciesId, newFormIndex);
      }
    }
  }

  /** Update the preferences for the ability index for a given species ID. */
  private setNewAbilityIndex(speciesId: StarterSpeciesId, abilityIndex: number): void {
    this.starterPreferences[speciesId] ??= {};
    this.originalStarterPreferences[speciesId] ??= {};
    this.starterPreferences[speciesId].abilityIndex = abilityIndex;
    this.originalStarterPreferences[speciesId].abilityIndex = abilityIndex;
  }

  /** Update the preferences for the nature for a given species ID. */
  private setNewNature(speciesId: StarterSpeciesId, nature: number): void {
    this.starterPreferences[speciesId] ??= {};
    this.originalStarterPreferences[speciesId] ??= {};
    this.starterPreferences[speciesId].nature = nature;
    this.originalStarterPreferences[speciesId].nature = nature;
  }

  /** Update the preferences for the tera type for a given species ID. */
  private setNewTeraType(speciesId: StarterSpeciesId, teraType: PokemonType): void {
    this.starterPreferences[speciesId] ??= {};
    this.originalStarterPreferences[speciesId] ??= {};
    this.starterPreferences[speciesId].tera = teraType;
    this.originalStarterPreferences[speciesId].tera = teraType;
  }

  /** Processes inputs while the cursor is on one of the party icons. */
  private processPartyIconInput(button: Button): boolean {
    let success = false;

    const numberOfCharacters = this.filteredCharacterIds.length;
    const onScreenLastIndex = Math.min(this.filteredCharacterIds.length - 1, ROWS * COLUMNS - 1);

    switch (button) {
      case Button.ACTION:
        this.openPokemonMenu();
        return true;
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
        if (this.partyIconsCursorIndex <= this.partyCharacterIds.length - 2) {
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
        if (numberOfCharacters > 0) {
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
        if (numberOfCharacters > 0) {
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

    const numberOfCharacters = this.filteredCharacterIds.length;
    const numOfRows = Math.ceil(numberOfCharacters / COLUMNS);
    const onScreenFirstIndex = this.scrollCursor * COLUMNS;
    const onScreenLastIndex = Math.min(this.filteredCharacterIds.length - onScreenFirstIndex - 1, ROWS * COLUMNS - 1);
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
        this.filterBarCursor = this.filterBar.getNearestFilter(this.characterContainers[this.cursor]);
        this.setFilterMode(true);
        success = true;
        break;
      case Button.DOWN:
        if (currentRow < numOfRows - 1 && this.scrollCursor * 9 + this.cursor + 9 < this.filteredCharacterIds.length) {
          // This is not the last row of starters
          if (currentRow - this.scrollCursor === 8) {
            // This is the last visible row, but there are more rows underneath, so we need to scroll
            this.scrollCursor++;
            this.updateScroll();
            this.setCursor(this.cursor);
            success = true;
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
        this.filterBarCursor = this.filterBar.getNearestFilter(this.characterContainers[this.cursor]);
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
        } else if (this.partyCharacterIds.length === 0) {
          // no starter in team and not on first row > wrap around to the last column
          success = this.setCursor(this.cursor + Math.min(8, onScreenLastIndex - this.cursor));
          break;
        } else if (onScreenCurrentRow < 7) {
          // at least one pokemon in team > for the first 7 rows, go to closest starter
          this.leaveGrid();
          this.partyIconsCursorIndex = findClosestStarterIndex(this.cursorObj.y - 1, this.partyCharacterIds.length);
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
        if (this.cursor % 9 < (currentRow < numOfRows - 1 ? 8 : (numberOfCharacters - 1) % 9)) {
          success = this.setCursor(this.cursor + 1);
          break;
        }

        // RIGHT from filtered Pokemon, on the right edge
        if (onScreenCurrentRow === 0) {
          // from the first row of starters we go to the random selection
          this.leaveGrid();
          this.showRandomCursor();
        } else if (this.partyCharacterIds.length === 0) {
          // no selected starter in team > wrap around to the first column
          success = this.setCursor(this.cursor - Math.min(8, this.cursor % 9));
          break;
        } else if (onScreenCurrentRow < 7) {
          // at least one pokemon in team > for the first 7 rows, go to closest starter
          this.leaveGrid();
          this.partyIconsCursorIndex = findClosestStarterIndex(this.cursorObj.y - 1, this.partyCharacterIds.length);
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

    let characterContainer: CharacterContainer;
    // The persistent starter data to apply e.g. candy upgrades
    const persistentStarterData = globalScene.gameData.starterData[this.lastCharId];
    // The sanitized starter preferences
    this.starterPreferences[this.lastCharId] ??= {};
    const starterPreferences = this.starterPreferences[this.lastCharId]!;
    // The original starter preferences
    this.originalStarterPreferences[this.lastCharId] ??= {};
    const originalStarterPreferences = this.originalStarterPreferences[this.lastCharId]!;
    const teamSave = getTeamSaveFromCharacterId(this.lastCharId);

    // this gets the correct pokemon cursor depending on whether you're in the starter screen or the party icons
    if (this.partyCursorObj.visible) {
      // if species is in filtered starters, get the starter container from the filtered starters, it can be undefined if the species is not in the filtered starters
      characterContainer =
        this.characterContainers[this.characterContainers.findIndex(container => container.charId === this.lastCharId)];
    } else {
      characterContainer = this.characterContainers[this.cursor];
    }

    const [isDupe, removeIndex]: [boolean, number] = this.isInParty(this.lastCharId);

    const isPartyValid = this.isPartyValid();
    const isValidForChallenge = checkStarterValidForChallenge(this.lastCharId, isPartyValid);

    const currentPartyValue = getPartyValue(this.partyCharacterIds);
    const newCost = 0;
    if (
      !isDupe
      && isValidForChallenge
      && currentPartyValue + newCost <= getRunValueLimit()
      && this.partyCharacterIds.length < PLAYER_PARTY_MAX_SIZE
    ) {
      options.push({
        label: i18next.t("starterSelectUiHandler:addToParty"),
        handler: () => {
          ui.setMode(UiMode.STARTER_SELECT);

          const isOverValueLimit = this.tryUpdateValue(0, true);

          if (isDupe || !isValidForChallenge) {
            // this should be redundant as there is now a trigger for when a pokemon can't be added to party
            ui.playError();
            return true;
          }

          this.starterCursorObjs[this.partyCharacterIds.length]
            .setVisible(true)
            .setPosition(this.cursorObj.x, this.cursorObj.y);
          this.addToParty(this.lastCharId);
          ui.playSelect();
          return true;
        },
        noSoundEffects: true,
      });
    } else if (isDupe) {
      options.push({
        label: i18next.t("starterSelectUiHandler:removeFromParty"),
        handler: () => {
          this.popCharacterAndTeammate(this.partyCharacterIds[removeIndex]);
          ui.setMode(UiMode.STARTER_SELECT);
          return true;
        },
      });
    }

    options.push({
      label: i18next.t("starterSelectUiHandler:toggleIVs"),
      handler: () => {
        this.toggleShowIvsMode();
        ui.setMode(UiMode.STARTER_SELECT);
        return true;
      },
    });

    const starterMoves = getCharacterMoves(this.lastCharId);
    if (starterMoves.length > 1) {
      const showSwapOptions = (moveset: StarterMoveset) => {
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
                                      showSwapOptions(this.starterMoveset!); // TODO: is this bang correct?
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
                                    showSwapOptions(this.starterMoveset!); // TODO: is this bang correct?
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
          showSwapOptions(this.starterMoveset!); // TODO: is this bang correct?
          return true;
        },
      });
    }

    if (teamSave.isPassiveUnlocked) {
      const isPassiveEnabled = CHARACTER_STATES[this.lastCharId].passive;
      // this is for enabling and disabling the passive
      const label = i18next.t(
        isPassiveEnabled ? "starterSelectUiHandler:disablePassive" : "starterSelectUiHandler:enablePassive",
      );
      options.push({
        label,
        handler: () => {
          CHARACTER_STATES[this.lastCharId].passive = !isPassiveEnabled;
          ui.setMode(UiMode.STARTER_SELECT);
          this.setCharacterDetails(this.lastCharId);
          return true;
        },
      });
    }
    // if container.favorite is false, show the favorite option
    const isFavorite = starterPreferences?.favorite ?? false;
    if (isFavorite) {
      options.push({
        label: i18next.t("starterSelectUiHandler:removeFromFavorites"),
        handler: () => {
          starterPreferences.favorite = false;
          originalStarterPreferences.favorite = false;
          // if the starter container not exists, it means the species is not in the filtered starters
          if (characterContainer) {
            characterContainer.favoriteIcon.setVisible(starterPreferences.favorite);
          }
          ui.setMode(UiMode.STARTER_SELECT);
          return true;
        },
      });
    } else {
      options.push({
        label: i18next.t("starterSelectUiHandler:addToFavorites"),
        handler: () => {
          starterPreferences.favorite = true;
          originalStarterPreferences.favorite = true;
          // if the starter container not exists, it means the species is not in the filtered starters
          if (characterContainer) {
            characterContainer.favoriteIcon.setVisible(starterPreferences.favorite);
          }
          ui.setMode(UiMode.STARTER_SELECT);
          return true;
        },
      });
    }

    options.push({
      label: i18next.t("menuUiHandler:pokedex"),
      handler: () => {
        ui.setMode(UiMode.STARTER_SELECT).then(() => {
          const attributes = {
            shiny: starterPreferences.shiny,
            variant: starterPreferences.variant,
            form: starterPreferences.formIndex,
            female: starterPreferences.female,
          };
          const species = speciesDataRegistry.getBaseSpecies(this.lastCharId);
          ui.setOverlayMode(UiMode.POKEDEX_PAGE, species, attributes, null, null, () => {
            if (species) {
              characterContainer = this.characterContainers[this.cursor];
              const persistentStarterData = globalScene.gameData.starterData[this.lastCharId];
              characterContainer.starterPassiveBgs.setVisible(
                !!persistentStarterData.passiveAttr && !globalScene.gameMode.hasChallenge(Challenges.FRESH_START),
              );
              this.setCharacter(this.lastCharId);
            }
          });
        });
        return true;
      },
    });
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
      if (this.showIvsMode) {
        this.toggleShowIvsMode(false);
        success = true;
      } else if (this.partyCharacterIds.length > 0) {
        this.popLastTeam();
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
      const teamSave = getTeamSaveFromCharacterId(this.lastCharId);
      if (!teamSave.isTeamUnlocked) {
        error = true;
      } else if (this.partyCharacterIds.length <= 6) {
        this.openPokemonMenu();
        success = true;
      }
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
   * Checks whether a given starter is already in the party.
   *
   * @param charId - The starter to check
   * @returns A tuple with a boolean indicating whether the starter is a duplicate
   * and the index of the starter if it is a duplicate
   */
  private isInParty(charId: CharacterId): [isDupe: boolean, removeIndex: number] {
    let removeIndex = 0;
    let isDupe = false;
    for (let s = 0; s < this.partyCharacterIds.length; s++) {
      if (this.partyCharacterIds[s] === charId) {
        isDupe = true;
        removeIndex = s;
        break;
      }
    }
    return [isDupe, removeIndex];
  }

  private addToParty(charId: CharacterId, playLeader = false): void {
    const team = getTeamFromCharacterId(charId);
    this.addCharacterToParty(team.leader);
    this.addCharacterToParty(team.follower);

    const cryCharId = playLeader ? team.leader : charId;
    speciesDataRegistry.getPokemonSpeciesForm(getSpeciesId(cryCharId), 0).cry();
  }

  private addCharacterToParty(charId: CharacterId): void {
    if (this.partyCharacterIds.length >= 6) {
      return;
    }

    const isFemale = getGender(charId).useFemale();
    const species = speciesDataRegistry.getBaseSpecies(charId);
    const shiny = isShiny(charId);
    const variant = getVariant(charId);
    this.partyIcons[this.partyCharacterIds.length].setTexture(species.getIconAtlasKey(0, shiny, variant));
    this.partyIcons[this.partyCharacterIds.length].setFrame(species.getIconId(isFemale, 0, shiny, variant));
    const icon: Sprite = this.partyIcons[this.partyCharacterIds.length];
    this.checkIconId(icon, charId);

    const char = CHARACTERS[charId];
    const starter = {
      speciesId: char.identity.speciesId,
      shiny: isShiny(charId),
      variant: getVariant(charId),
      formIndex: 0,
      female: char.identity.gender.useFemale(),
      abilityIndex: CHARACTER_STATES[charId].hiddenAbility ? 0 : 1,
      passive: CHARACTER_STATES[charId].passive,
      nature: char.balance.nature,
      moveset: this.starterMoveset?.slice(0) as StarterMoveset,
      pokerus: false,
      nickname: char.identity.name,
      teraType: char.balance.teraType,
      ivs: [31, 31, 31, 31, 31, 31],
    };

    this.partyStarters.push(starter);
    this.partyCharacterIds.push(charId);
    this.updateInstructions();
  }

  private updatePartyIcon(charId: CharacterId, index: number): void {
    const species = speciesDataRegistry.getSpecies(getSpeciesId(charId));
    this.partyIcons[index]
      .setTexture(species.getIconAtlasKey(0, false, 0))
      .setFrame(species.getIconId(false, 0, false, 0));
    this.checkIconId(this.partyIcons[index], charId);
  }

  /**
   * Puts a move at the requested index in the current highlighted Pokemon's moveset. \
   * If the move was already present in the moveset, swap its position with the one at the requested index.
   * @remarks
   * ⚠️ {@linkcode starterMoveset | this.starterMoveset} **must not be null when this method is called**
   * @param targetIndex - The index to place the move
   * @param newMove - The move to place in the moveset
   * @param previousMove - The move that was previously in the spot
   */
  private switchMoveHandler(targetIndex: number, newMove: MoveId, previousMove: MoveId): void {
    const starterMoveset = this.starterMoveset;
    if (starterMoveset == null) {
      console.warn("Trying to update a non-existing moveset");
      return;
    }

    const starterId = this.lastCharId;
    const existingMoveIndex = starterMoveset.indexOf(newMove);
    starterMoveset[targetIndex] = newMove;
    if (existingMoveIndex !== -1) {
      starterMoveset[existingMoveIndex] = previousMove;
    }
    const updatedMoveset = starterMoveset.slice() as StarterMoveset;
    const starterDataEntry = globalScene.gameData.starterData[starterId];
    starterDataEntry.moveset = updatedMoveset;
    this.hasSwappedMoves = true;
    // TODO: we shouldn't need to call setStarterDetails here, since only the moveset is changing
    this.setCharacterDetails(this.lastCharId);
    this.updateSelectedStarterMoveset(starterId);
  }

  /**
   * Update the starter moveset for the given species if it is part of the selected starters.
   *
   * @remarks
   * It is safe to call with a species that is not part of the selected starters.
   *
   * @param id - The species ID to update the moveset for
   */
  private updateSelectedStarterMoveset(id: CharacterId): void {
    if (this.starterMoveset === null) {
      return;
    }

    for (const [index, starterId] of this.partyCharacterIds.entries()) {
      if (starterId === id) {
        this.partyStarters[index].moveset = this.starterMoveset;
      }
    }
  }

  protected updateInstructions(): void {
    const teamSave = getTeamSaveFromCharacterId(this.lastCharId);
    this.instructionsContainer.updateInstructions(this.canCycle, teamSave.isTeamUnlocked, this.filterMode);
  }

  protected updateStarters(): void {
    this.scrollCursor = 0;

    this.filterBar.updateFilterLabels();

    this.filterCharacters();

    this.starterSelectScrollBar.setTotalRows(Math.max(Math.ceil(this.filteredCharacterIds.length / 9), 1));
    this.starterSelectScrollBar.setScrollCursor(0);

    const sort = this.filterBar.getVals(DropDownColumn.SORT)[0];
    sortCharacters(this.filteredCharacterIds, sort.val, sort.dir);

    this.updateScroll();
    this.tryUpdateValue();

    this.characterContainers.forEach(container => {
      this.setUpgradeAnimation(container);
    });
  }

  private filterCharacters(): void {
    this.filteredCharacterIds = getEnumValues(CharacterId).filter(charId => {
      // Exclude starters which are not valid for the challenge
      if (globalScene.gameMode.modeId === GameModes.CHALLENGE && !isCharacterValidForChallenge(charId)) {
        return false;
      }

      const species = speciesDataRegistry.getBaseSpecies(charId);
      const teamSave = getTeamSaveFromCharacterId(charId);

      // Gen filter
      const fitsGen = this.filterBar.getVals(DropDownColumn.GEN).includes(species.generation);

      // Type filter
      const fitsType = this.filterBar
        .getVals(DropDownColumn.TYPES)
        .some(type => species.isOfType((type as number) - 1));

      // Caught / Shiny filter

      const fitsUnlocked = this.filterBar.getVals(DropDownColumn.UNLOCKED).some(unlocked => {
        if (unlocked === "LOCKED") {
          return !teamSave.isTeamUnlocked;
        }
        if (unlocked === "UNLOCKED") {
          return teamSave.isTeamUnlocked;
        }
        return false;
      });

      // Passive Filter
      const fitsPassive = this.filterBar.getVals(DropDownColumn.UNLOCKS).some(unlocks => {
        if (unlocks.val === "PASSIVE" && unlocks.state === DropDownState.ON) {
          return teamSave.isPassiveUnlocked;
        }
        if (unlocks.val === "PASSIVE" && unlocks.state === DropDownState.EXCLUDE) {
          return !teamSave.isPassiveUnlocked;
        }
        return unlocks.val === "PASSIVE" && unlocks.state === DropDownState.OFF;
      });
      // HA Filter
      const fitsHA = this.filterBar.getVals(DropDownColumn.UNLOCKS).some(unlocks => {
        if (unlocks.val === "HIDDEN ABILITY" && unlocks.state === DropDownState.ON) {
          return teamSave.isAbilityUnlocked;
        }
        if (unlocks.val === "HIDDEN ABILITY" && unlocks.state === DropDownState.EXCLUDE) {
          return !teamSave.isAbilityUnlocked;
        }
        return unlocks.val === "HIDDEN ABILITY" && unlocks.state === DropDownState.OFF;
      });

      // Favorite Filter
      const isFavorite = this.starterPreferences[charId]?.favorite ?? false;
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

      // Ribbon / Classic Win Filter
      const hasWon = teamSave.winCount > 0;
      const fitsWin = this.filterBar.getVals(DropDownColumn.MISC).some(misc => {
        if (misc.val === "WIN" && misc.state === DropDownState.ON) {
          return hasWon;
        }
        if (misc.val === "WIN" && misc.state === DropDownState.EXCLUDE) {
          return !hasWon;
        }
        return misc.val === "WIN" && misc.state === DropDownState.OFF;
      });

      if (fitsGen && fitsType && fitsUnlocked && fitsPassive && fitsFavorite && fitsWin && fitsHA) {
        return true;
      }
      return false;
    });
  }

  protected updateScroll(): void {
    const onScreenFirstIndex = this.scrollCursor * COLUMNS;

    this.starterSelectScrollBar.setScrollCursor(this.scrollCursor);

    this.pokerusCursorObjs.forEach(cursor => cursor.setVisible(false));
    this.starterCursorObjs.forEach(cursor => cursor.setVisible(false));

    const pokerusCursorIndex = 0;
    this.characterContainers.forEach((container, i) => {
      const offset_i = i + onScreenFirstIndex;

      if (offset_i >= this.filteredCharacterIds.length) {
        container.setVisible(false);
        return;
      }

      const charId = this.filteredCharacterIds[offset_i];
      const species = speciesDataRegistry.getSpecies(getSpeciesId(charId));
      const teamSave = getTeamSaveFromCharacterId(charId);

      container.setVisible(true);

      container.setCharacter(CHARACTERS[charId]);

      const starterSprite = container.icon;
      starterSprite.setTexture(
        species.getIconAtlasKey(0, false, 0),
        container.baseSpecies.getIconId(false, 0, false, 0),
      );

      if (teamSave.isTeamUnlocked || settings.general.dexForDevs) {
        container.icon.clearTint();
      } else {
        container.icon.setTint(0x808080);
      }

      if (this.partyCharacterIds.includes(charId)) {
        this.starterCursorObjs[this.partyCharacterIds.indexOf(charId)]
          .setPosition(container.x - 1, container.y + 1)
          .setVisible(true);
      }

      this.updateStarterValueLabel(container);

      container.label.setVisible(true);
      const speciesVariants = [];
      for (let v = 0; v < 3; v++) {
        const hasVariant = speciesVariants.length > v;
        container.shinyIcons[v].setVisible(hasVariant);

        if (!hasVariant) {
          continue;
        }

        let setVariant: Variant = 2;
        if (speciesVariants[v] === DexAttr.DEFAULT_VARIANT) {
          setVariant = 0;
        }
        if (speciesVariants[v] === DexAttr.VARIANT_2) {
          setVariant = 1;
        }
        container.shinyIcons[v].setTint(getVariantTint(setVariant));
      }

      container.starterPassiveBgs.setVisible(teamSave.isTeamUnlocked && teamSave.isPassiveUnlocked);
      container.hiddenAbilityIcon.setVisible(teamSave.isTeamUnlocked && teamSave.isAbilityUnlocked);
      container.classicWinIcon
        .setVisible(teamSave.isTeamUnlocked && teamSave.winCount > 0)
        .setTexture("champion_ribbon");
      container.favoriteIcon.setVisible(this.starterPreferences[charId]?.favorite ?? false);
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
      cursor = Math.max(Math.min(this.characterContainers.length - 1, cursor), 0);
      changed = super.setCursor(cursor);

      const pos = calcStarterContainerPosition(cursor);
      this.cursorObj.setPosition(pos.x - 1, pos.y + 1);

      const charId = this.characterContainers[cursor].charId;

      if (charId >= 0) {
        this.setCharacter(charId);
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
    if (this.partyCharacterIds.length > 0) {
      this.partyCursorObj.setVisible(true);
      this.setPartyStarter(this.partyCharacterIds[index]);
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
    this.characterSummary.setNoStarter();
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
   * @param charId - the id of the new starter
   */
  private setCharacter(charId: CharacterId, iconAnimation = true): void {
    // Stop animation for the previously selected starter
    this.stopIconAnimation(this.oldCursor);
    this.lastCharId = charId;
    const teamSave = getTeamSaveFromCharacterId(charId);

    this.characterSummary.setCharacter(charId);

    if (teamSave.isTeamUnlocked) {
      this.setCharacterDetails(charId, false);

      if (iconAnimation) {
        this.startIconAnimation(this.cursor);
      }
    } else {
      this.resetStarterDetails();
    }
  }

  private setPartyStarter(charId: CharacterId): void {
    // Set the cursors, using preferences if possible, default options otherwise
    this.characterSummary.setCharacter(charId);
    this.lastCharId = charId;

    if (getTeamSaveFromCharacterId(charId).isTeamUnlocked) {
      this.setCharacterDetails(charId, false);
    } else {
      this.resetStarterDetails();
    }
  }

  /**
   * Starts the icon animation of the container at the given cursor.
   *
   * @param cursor - the index of the container, ranging from 1 to
   * .
   */
  protected startIconAnimation(cursor: number): void {
    const icon = this.characterContainers[cursor].icon;
    // Initiates the small up and down idle animation
    this.iconAnimHandler.addOrUpdate(icon, PokemonIconAnimMode.PASSIVE);
  }

  /**
   * Stops the icon animation of the container at the given cursor.
   *
   * @param cursor - the index of the container, ranging from 1 to 81.
   */

  protected stopIconAnimation(cursor: number): void {
    const container = this.characterContainers[cursor];
    if (!container) {
      return;
    }

    const lastStarterIcon = container.icon;
    this.checkIconId(lastStarterIcon, container.charId);
    this.iconAnimHandler.addOrUpdate(container.icon, PokemonIconAnimMode.NONE);
  }

  // TODO: check whether this is still necessary
  private resetStarterDetails(): void {
    this.starterMoveset = null;

    this.tryUpdateValue();
    this.updateInstructions();
  }

  /**
   * Updates all information for the current starter.
   * This should be called every time that preferences are updated.
   *
   * Among other things, it updates the moveset and party information to match the current preferences.
   *
   * @param charId - the id of the new starter
   * @param save - whether the new details should be saved to local storage.
   */
  private setCharacterDetails(charId: CharacterId, save = true): void {
    this.characterSummary.setCharacterDetails(charId);

    const [isInParty, partyIndex]: [boolean, number] = this.isInParty(charId);
    if (isInParty) {
      this.updatePartyIcon(charId, partyIndex);
    }

    // If the starter is in the party, update the information in the party
    const starterIndex = this.partyCharacterIds.indexOf(charId);
    if (starterIndex > -1) {
      const characterState = getCharacterState(charId);

      const starter = this.partyStarters[starterIndex];
      starter.shiny = isShiny(charId);
      starter.variant = getVariant(charId);
      starter.female = getGender(charId).useFemale();
      starter.formIndex = getFormIndex(charId);
      starter.abilityIndex = characterState.hiddenAbility ? 0 : 1;
      starter.nature = getBalance(charId).nature;
      starter.teraType = getBalance(charId).teraType;
    }

    const currentContainer = this.characterContainers.find(p => p.charId === charId);
    if (currentContainer) {
      const starterSprite = currentContainer.icon;
      const species = speciesDataRegistry.getSpecies(getSpeciesId(charId));
      starterSprite.setTexture(
        species.getIconAtlasKeyFromCharacterId(charId),
        species.getIconIdFromCharacterId(charId),
      );
    }

    this.updateCanCycle(charId);
    this.populateCharacterMoveset(charId);
    this.updateSelectedStarterMoveset(charId);

    // TODO: What does this do?
    this.tryUpdateValue();

    this.updateInstructions();

    if (save) {
      saveStarterPreferences(this.originalStarterPreferences);
    }
  }

  /**
   * Update {@linkcode canCycle}, which determines whether buttons to cycle ability and passive should be visible.
   *
   * @param charId - the id of the current selected character.
   */
  private updateCanCycle(charId: CharacterId): void {
    const teamSave = getTeamSaveFromCharacterId(charId);
    this.canCycle.ability = teamSave.isAbilityUnlocked;
    this.canCycle.form = false;
    this.canCycle.gender = false;
    this.canCycle.shiny = false;
    this.canCycle.nature = false;
    this.canCycle.tera = false;
  }

  /**
   * Function called when a new character is selected, used to populate its moveset.
   *
   * @param charId - the id of the current selected character.
   */
  private populateCharacterMoveset(charId: CharacterId): void {
    this.starterMoveset = null;
    const starterMoves = getCharacterMoves(charId);
    const speciesId = getSpeciesId(charId);

    const charState = getCharacterState(charId);
    const speciesMoveData = charState.activeMoves;
    const moveData: StarterMoveset | null = speciesMoveData
      ? Array.isArray(speciesMoveData)
        ? speciesMoveData
        : speciesMoveData[0]
      : null;
    const availableStarterMoves = starterMoves.concat(
      Object.hasOwn(speciesEggMoves, speciesId) ? speciesEggMoves[speciesId] : [],
    );
    this.starterMoveset = (moveData || (starterMoves.slice(0, 4) as StarterMoveset)).filter(m =>
      availableStarterMoves.find(sm => sm === m),
    ) as StarterMoveset;
    // Consolidate move data if it contains an incompatible move
    if (this.starterMoveset.length < 4 && this.starterMoveset.length < availableStarterMoves.length) {
      this.starterMoveset.push(
        ...availableStarterMoves
          .filter(sm => this.starterMoveset?.indexOf(sm) === -1)
          .slice(0, 4 - this.starterMoveset.length),
      );
    }

    // Remove duplicate moves
    this.starterMoveset = this.starterMoveset.filter(
      (move, i) => this.starterMoveset?.indexOf(move) === i,
    ) as StarterMoveset;

    if (!this.starterMoveset) {
      this.starterMoveset = starterMoves.slice(0, 4) as StarterMoveset;
    }
    this.characterSummary.updateMoveset(this.starterMoveset);
  }

  private popLastTeam(): void {
    this.popCharacterAndTeammate(this.partyCharacterIds[this.partyCharacterIds.length - 1]);
  }

  private popCharacterAndTeammate(charId: CharacterId): void {
    const team = getTeamFromCharacterId(charId);
    this.popCharacter(team.leader);
    this.popCharacter(team.follower);
  }

  private popCharacter(charId: CharacterId): void {
    const index = this.partyCharacterIds.indexOf(charId);
    if (index < 0) {
      return;
    }

    this.partyCharacterIds.splice(index, 1);
    this.partyStarters.splice(index, 1);

    for (let s = 0; s < this.partyCharacterIds.length; s++) {
      const charId = this.partyCharacterIds[s];
      const species = speciesDataRegistry.getSpecies(getSpeciesId(charId!));
      this.partyIcons[s]
        .setTexture(species.getIconAtlasKeyFromCharacterId(charId))
        .setFrame(species.getIconIdFromCharacterId(charId));
      this.checkIconId(this.partyIcons[s], charId);
      if (s >= index) {
        this.starterCursorObjs[s]
          .setPosition(this.starterCursorObjs[s + 1].x, this.starterCursorObjs[s + 1].y)
          .setVisible(this.starterCursorObjs[s + 1].visible);
      }
    }
    this.starterCursorObjs[this.partyCharacterIds.length].setVisible(false);
    this.partyIcons[this.partyCharacterIds.length] //
      .setTexture("pokemon_icons_0")
      .setFrame("unknown");

    if (this.partyCursorObj.visible) {
      if (this.partyIconsCursorIndex === this.partyCharacterIds.length) {
        if (this.partyCharacterIds.length > 0) {
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
    } else if (this.startCursorObj.visible && this.partyCharacterIds.length === 0) {
      // On the start button and no more Pokemon in party
      this.startCursorObj.setVisible(false);
      if (this.filteredCharacterIds.length > 0) {
        // Back to the first Pokemon if there is one
        this.cursorObj.setVisible(true);
        this.setCursor(this.scrollCursor * 9);
      } else {
        // Back to filters
        this.filterBarCursor = Math.max(1, this.filterBar.numFilters - 1);
        this.setFilterMode(true);
      }
    }

    this.tryUpdateValue();
  }

  // TODO: Dedupe from pokedex
  protected updateStarterValueLabel(container: CharacterContainer): void {
    const baseSpeciesId = container.baseSpecies.speciesId as StarterSpeciesId;
    const baseStarterValue = speciesDataRegistry.getStarterCost(baseSpeciesId);
    if (baseStarterValue == null) {
      return;
    }
    const starterValue = globalScene.gameData.getSpeciesStarterValue(baseSpeciesId);
    container.cost = starterValue;
    let valueStr: string = starterValue.toString();
    if (valueStr.startsWith("0.")) {
      valueStr = valueStr.slice(1);
    }
    container.label.setText(valueStr);
    let textStyle: TextStyle;
    switch (baseStarterValue - starterValue) {
      case -2:
      case -1:
        textStyle = TextStyle.SUMMARY_RED;
        break;
      case 0:
        textStyle = TextStyle.WINDOW;
        break;
      case 1:
      case 0.5:
        textStyle = TextStyle.SUMMARY_BLUE;
        break;
      default:
        textStyle = TextStyle.SUMMARY_GOLD;
        break;
    }
    container.label.setColor(getTextColor(textStyle)).setShadowColor(getTextColor(textStyle, true));
  }

  private tryUpdateValue(add = 0, addingToParty?: boolean): boolean {
    const value = getPartyValue(this.partyCharacterIds);
    const newValue = value + add;
    const valueLimit = getRunValueLimit();
    const overLimit = newValue > valueLimit;
    let newValueStr: string = newValue.toString();
    if (newValueStr.startsWith("0.")) {
      newValueStr = newValueStr.slice(1);
    }
    this.valueLimitLabel
      .setText(`${newValueStr}/${valueLimit}`)
      .setColor(getTextColor(overLimit ? TextStyle.SUMMARY_PINK : TextStyle.TOOLTIP_CONTENT))
      .setShadowColor(getTextColor(overLimit ? TextStyle.SUMMARY_PINK : TextStyle.TOOLTIP_CONTENT, true));
    if (overLimit) {
      globalScene.time.delayedCall(fixedInt(500), () => this.tryUpdateValue());
      return false;
    }
    let isPartyValid = this.isPartyValid();
    if (addingToParty) {
      const charId = this.characterContainers[this.cursor].charId as CharacterId;
      const isNewPokemonValid = checkStarterValidForChallenge(charId, false);
      isPartyValid ||= isNewPokemonValid;
    }

    // TODO: extract this logic and unify it with the one applied after filtering or scrolling
    /** this loop is used to set each container's alpha value and check if the user can select other pokemon. */
    const remainValue = valueLimit - newValue;
    for (const container of this.characterContainers) {
      const charId = container.charId as CharacterId;

      /** Cost of pokemon species */
      const speciesStarterValue = 0;
      /** {@linkcode Phaser.GameObjects.Sprite} object of Pokémon for setting the alpha value */
      const speciesSprite = container.icon;

      // TODO: fix this comment
      /**
       * If `remainValue` greater than or equal pokemon species and the pokemon is legal for this challenge, the user can select.
       * so that the alpha value of pokemon sprite set 1.
       *
       * However, if `isPartyValid` is false, that means none of the party members are valid for the run. \
       * In this case, we should check the challenge to make sure evolutions and forms aren't being checked for mono type runs. \
       * This will let us set the sprite's alpha to show it can't be selected
       *
       * If `speciesStarterDexEntry.caughtAttr` is `true`, this species registered in stater. \
       * We change to can AddParty value to `true` since the user has enough cost to choose this pokemon and this pokemon registered too.
       */
      const isValidForChallenge = checkStarterValidForChallenge(charId, isPartyValid);

      const canBeChosen = remainValue >= speciesStarterValue && isValidForChallenge;

      // this will get the value of `isDupe` from `isInParty`.
      // This will let us see if the pokemon in question is in our party already so we don't grey out the sprites if they're invalid
      const isPokemonInParty = this.isInParty(charId)[0];

      /*
       * This code does a check to tell whether or not a sprite should be lit up or greyed out. There are 3 ways a pokemon's sprite should be lit up:
       * 1) If it's in your party, it's a valid pokemon (i.e. for challenge) and you have enough points to have it
       * 2) If it's in your party, it's not valid (i.e. for challenges), and you have enough points to have it
       * 3) If it's not in your party, but it's a valid pokemon and you have enough points for it
       * Any other time, the sprite should be greyed out.
       * For example, if it's in your party, valid, but costs too much, or if it's not in your party and not valid, regardless of cost
       */
      if (canBeChosen || (isPokemonInParty && remainValue >= speciesStarterValue)) {
        speciesSprite.setAlpha(1);
      } else {
        // TODO: fix this comment
        // If it can't be chosen, the user can't select.
        // so that the alpha value of pokemon sprite set 0.375.
        speciesSprite.setAlpha(0.375);
      }
    }

    return true;
  }

  // TODO: this is always called with `tryStart(true)`, is this param necessary?
  private tryStart(manualTrigger = false): boolean {
    if (this.partyCharacterIds.length === 0) {
      return false;
    }
    this.blockInput = true;

    if (this.isPartyValid()) {
      const ui = this.getUi();

      const cancelStartRun = () => {
        ui.setMode(UiMode.STARTER_SELECT);
        if (!manualTrigger) {
          this.popLastTeam();
        }
        this.clearText();
      };

      const startRun = () => {
        globalScene.money = globalScene.gameMode.getStartingMoney();
        const starters = this.partyStarters.slice(0);
        ui.setMode(UiMode.STARTER_SELECT);
        const originalStarterSelectCallback = this.starterSelectCallback;
        this.starterSelectCallback = null;
        originalStarterSelectCallback?.(starters);
      };

      const confirmStartOptions: ConfirmModeConfig = {
        yesHandler: startRun,
        noHandler: cancelStartRun,
        yOffset: 29,
      };

      ui.showText(i18next.t("starterSelectUiHandler:confirmStartTeam"), null, () => {
        this.blockInput = false;
        ui.setModeWithoutClear(UiMode.CONFIRM, confirmStartOptions);
      });
    } else {
      this.blockInput = false;
      this.tutorialActive = true;
      this.showText(
        i18next.t("starterSelectUiHandler:invalidParty"),
        undefined,
        () => this.showText("", 0, () => (this.tutorialActive = false)),
        undefined,
        true,
      );
    }
    return true;
  }

  /** Check that each pokemon in the party is valid for the current challenge. */
  private isPartyValid(): boolean {
    let canStart = false;
    for (let s = 0; s < this.partyCharacterIds.length; s++) {
      const starterId = this.partyCharacterIds[s];
      const starter = this.partyStarters[s];
      const isValidForChallenge = checkStarterValidForChallenge(starterId, false);
      canStart ||= isValidForChallenge;
    }
    return canStart;
  }

  private toggleShowIvsMode(on = !this.showIvsMode): void {
    if (on) {
      this.showIvsMode = true;
      this.characterSummary.showStats();
      this.updateInstructions();
      return;
    }

    this.showIvsMode = false;
    this.characterSummary.hideStats();
    this.updateInstructions();
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
      if (globalScene.gameMode.isChallenge) {
        globalScene.phaseManager.clearPhaseQueue();
        globalScene.phaseManager.pushNew("SelectChallengePhase");
        globalScene.phaseManager.pushNew("EncounterPhase");
      } else {
        globalScene.phaseManager.toTitleScreen();
      }
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

    saveStarterPreferences(this.originalStarterPreferences);

    this.clearStarterPreferences();
    this.cursor = -1;
    this.oldCursor = -1;
    this.instructionsContainer.hideInstructions();
    this.randomCursorObj.setVisible(false);

    this.characterSummary.clear();

    this.starterSelectContainer.setVisible(false);
    this.blockInput = false;

    while (this.partyCharacterIds.length > 0) {
      this.partyCursorObj.setVisible(false);
      this.popLastTeam();
    }

    if (this.showIvsMode) {
      this.toggleShowIvsMode(false);
    }
  }

  protected checkIconId(icon: Phaser.GameObjects.Sprite, charId: CharacterId): void {
    const species = speciesDataRegistry.getSpecies(getSpeciesId(charId));
    if (icon.frame.name !== species.getIconIdFromCharacterId(charId)) {
      console.log(`${species.name}'s icon ${icon.frame.name} does not match getIconId with charId: ${charId}`);
      icon
        .setTexture(species.getIconAtlasKeyFromCharacterId(charId))
        .setFrame(species.getIconIdFromCharacterId(charId));
    }
  }

  /**
   * Clears this UI's starter preferences.
   *
   * Designed to be used for unit tests that utilize this UI.
   */
  public clearStarterPreferences(): void {
    this.starterPreferences = {} as AllStarterPreferences;
    this.originalStarterPreferences = {} as AllStarterPreferences;
  }

  public override destroy(): void {
    // Without this the reference gets hung up and no startercontainers get GCd
    for (const container of this.characterContainers) {
      container.destroy();
    }
    this.characterContainers = [];
  }
}

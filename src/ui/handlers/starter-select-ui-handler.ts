import { PLAYER_PARTY_MAX_SIZE } from "#app/constants";
import { audioManager } from "#app/global-audio-manager";
import { globalScene } from "#app/global-scene";
import { settings } from "#app/global-settings-manager";
import { speciesDataRegistry } from "#app/global-species-data-registry";
import { teamMemberDataRegistry } from "#app/global-team-member-data-registry";
import { handleTutorial, Tutorial } from "#app/tutorial";
import { teamMemberMoveOptions } from "#balance/egg-moves";
import { allMoves } from "#data/data-lists";
import { Gender } from "#data/gender";
import { getNatureName } from "#data/nature";
import type { PokemonSpecies } from "#data/pokemon-species";
import { AbilityAttr } from "#enums/ability-attr";
import { AbilityId } from "#enums/ability-id";
import { Button } from "#enums/buttons";
import { DexAttr } from "#enums/dex-attr";
import { DropDownColumn } from "#enums/drop-down-column";
import type { MoveId } from "#enums/move-id";
import type { Nature } from "#enums/nature";
import { Passive as PassiveAttr } from "#enums/passive";
import { PokemonIconAnimMode } from "#enums/pokemon-icon-anim-mode";
import { PokemonType } from "#enums/pokemon-type";
import type { TeamMemberId } from "#enums/team-member-id";
import { TextStyle } from "#enums/text-style";
import { UiMode } from "#enums/ui-mode";
import type { Variant } from "#sprites/variant";
import { getVariantTint } from "#sprites/variant";
import { achvs } from "#system/achv";
import { RibbonData } from "#system/ribbons/ribbon-data";
import type { TeamMemberData } from "#types/pokemon-species";
import type {
  AllTeamMemberPreferences,
  DexAttrProps,
  StarterPreferences,
  TeamMemberMoveset,
  TeamMemberPreferences,
} from "#types/save-data";
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
import { StarterContainer } from "#ui/starter-container";
import { StarterSelectInstructionsContainer } from "#ui/starter-select-instructions";
import {
  getDexAttrFromPreferences,
  getStarterDetailsFromPreferences,
  getStarterDexAttrPropsFromPreferences,
  getTeamMemberMoves,
  getTeamMemberDataEntry as setTeamMemberData,
  sortTeamMembers,
} from "#ui/starter-select-ui-utils";
import { StarterSummary } from "#ui/starter-summary";
import { addTextObject } from "#ui/text";
import { addWindow } from "#ui/ui-theme";
import { getLocalizedSpriteKey } from "#utils/common";
import { deepCopy, loadStarterPreferences, saveStarterPreferences } from "#utils/data";
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

  private starterContainers: StarterContainer[] = [];
  public cursorObj: Phaser.GameObjects.Image;
  private starterCursorObjs: Phaser.GameObjects.Image[];
  private starterSelectScrollBar: ScrollBar;
  private scrollCursor: number;
  private filteredTeamMemberIds: TeamMemberId[] = [];
  private lastTeamMemberId: TeamMemberId;

  private partyColumn: GameObjects.Container;
  private partyIcons: Phaser.GameObjects.Sprite[];
  private partyCursorObj: Phaser.GameObjects.Image;
  private partyIconsCursorIndex: number;
  private readonly partyTeamMembers: TeamMemberData[] = [];
  // TODO: this should be a getter, not an array that needs to be kept in sync with `this.partyStarters`
  public partyTeamMemberIds: TeamMemberId[] = [];
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

  private starterMoveset: TeamMemberMoveset | null;
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

  private teamMemberPreferences: AllTeamMemberPreferences;
  private originalStarterPreferences: AllTeamMemberPreferences;

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

    const allTeamMembers = teamMemberDataRegistry.getAllTeamMembers();

    for (let i = 0; i < 81 && i < allTeamMembers.length; i++) {
      const pos = calcStarterContainerPosition(i);
      const starterContainer = new StarterContainer(allTeamMembers[i]) //
        .setVisible(false)
        .setPosition(pos.x, pos.y);
      this.iconAnimHandler.addOrUpdate(starterContainer.icon, PokemonIconAnimMode.NONE);
      this.starterContainers.push(starterContainer);
      starterBoxContainer.add(starterContainer);
    }

    this.starterSummary = new StarterSummary(0, 0);

    this.instructionsContainer = new StarterSelectInstructionsContainer(0, 0);

    this.starterSelectMessageBoxContainer = globalScene.add.container(0, sHeight).setVisible(false);

    this.starterSelectMessageBox = addWindow(1, -1, 318, 28) //
      .setOrigin(0, 1);
    this.starterSelectMessageBoxContainer.add(this.starterSelectMessageBox);

    this.message = addTextObject(8, 8, "", TextStyle.WINDOW, { maxLines: 2 }) //
      .setOrigin(0);
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

    const caughtOptions = [
      new DropDownOption("NORMAL", new DropDownLabel(i18next.t("filterBar:normal"))),
      new DropDownOption("UNCAUGHT", new DropDownLabel(i18next.t("filterBar:uncaught"))),
    ];

    filterBar.addFilter(
      DropDownColumn.CAUGHT,
      i18next.t("filterBar:caughtFilter"),
      new DropDown(0, 0, caughtOptions, () => this.updateStarters(), DropDownType.HYBRID),
    );

    // unlocks filter
    const passiveLabels = [
      new DropDownLabel(i18next.t("filterBar:passive"), undefined, DropDownState.OFF),
      new DropDownLabel(i18next.t("filterBar:passiveUnlocked"), undefined, DropDownState.ON),
      new DropDownLabel(i18next.t("filterBar:passiveLocked"), undefined, DropDownState.EXCLUDE),
    ];

    const unlocksOptions = [new DropDownOption("PASSIVE", passiveLabels)];

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
    const hiddenAbilityLabels = [
      new DropDownLabel(i18next.t("filterBar:hiddenAbility"), undefined, DropDownState.OFF),
      new DropDownLabel(i18next.t("filterBar:hasHiddenAbility"), undefined, DropDownState.ON),
      new DropDownLabel(i18next.t("filterBar:noHiddenAbility"), undefined, DropDownState.EXCLUDE),
    ];
    const miscOptions = [
      new DropDownOption("FAVORITE", favoriteLabels),
      new DropDownOption("WIN", winLabels),
      new DropDownOption("HIDDEN_ABILITY", hiddenAbilityLabels),
    ];
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

    this.allowTera = Object.hasOwn(globalScene.gameData.achvUnlocks, achvs.TERASTALLIZE.id);

    if (args.length > 0 && args[0] instanceof Function) {
      super.show(args);
      this.teamMemberSelectCallback = args[0] as TeamMemberSelectCallback;

      this.starterSelectContainer.setVisible(true);

      this.teamMemberPreferences = loadStarterPreferences();
      // Deep copy the JSON (avoid re-loading from disk)
      this.originalStarterPreferences = deepCopy(this.teamMemberPreferences);

      teamMemberDataRegistry.getAllTeamMembers().forEach(teamMemberData => {
        const teamMemberId = teamMemberData.teamMemberId;
        // Initialize the StarterPreferences for this species
        this.teamMemberPreferences[teamMemberId] = this.initStarterPrefs(teamMemberId, this.teamMemberPreferences);
        this.originalStarterPreferences[teamMemberId] = this.initStarterPrefs(
          teamMemberId,
          this.originalStarterPreferences,
        );
      });

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

  /**
   * Return the sanitized starter preferences for the given PokemonSpecies.
   *
   * If somehow a preference is set for a form, variant, gender, ability or nature
   * that wasn't actually unlocked or is invalid it will be cleared here.
   *
   * Any options that are not allowed in the current challenge are also removed, unless the caller specifies otherwise.
   *
   * @param starterId - The species to get starter preferences for
   * @param preferences - The {@linkcode AllTeamMemberPreferences} object to extract the preferences from
   * @param ignoreChallenge - (Default `false`) Whether the current challenge should be ignored while sanitizing
   * @returns The {@linkcode StarterPreferences} for the species
   */
  protected initStarterPrefs(teamMemberId: TeamMemberId, preferences: AllTeamMemberPreferences): TeamMemberPreferences {
    // if preferences for the species is undefined, set it to an empty object
    preferences[teamMemberId] ??= {};
    const starterPreferences = preferences[teamMemberId];
    const { dexEntry, starterDataEntry: starterData } = setTeamMemberData(teamMemberId);

    const species = teamMemberDataRegistry.getSpecies(teamMemberId);

    // no preferences or Pokemon wasn't caught, return empty attribute
    if (!starterPreferences || !dexEntry.caughtAttr) {
      return {};
    }

    const caughtAttr = dexEntry.caughtAttr;

    const hasShiny = caughtAttr & DexAttr.SHINY;
    const hasNonShiny = caughtAttr & DexAttr.NON_SHINY;
    if (starterPreferences.shiny && !hasShiny) {
      // shiny form wasn't unlocked, purging shiny and variant setting
      starterPreferences.shiny = undefined;
      starterPreferences.variant = undefined;
    } else if (starterPreferences.shiny === false && !hasNonShiny) {
      // non shiny form wasn't unlocked, purging shiny setting
      starterPreferences.shiny = undefined;
    }

    if (starterPreferences.variant !== undefined) {
      const unlockedVariants = [
        hasShiny && caughtAttr & DexAttr.DEFAULT_VARIANT,
        hasShiny && caughtAttr & DexAttr.VARIANT_2,
        hasShiny && caughtAttr & DexAttr.VARIANT_3,
      ];
      if (
        Number.isNaN(starterPreferences.variant)
        || starterPreferences.variant < 0
        || !unlockedVariants[starterPreferences.variant]
      ) {
        // variant value is invalid or requested variant wasn't unlocked, purging setting
        starterPreferences.variant = undefined;
      }
    }
    starterPreferences.gender = teamMemberDataRegistry.getTeamMember(teamMemberId).gender || Gender.NONBINARY;

    if (starterPreferences.abilityIndex !== undefined) {
      const speciesHasSingleAbility = species.ability2 === species.ability1;
      const abilityAttr = starterData.abilityAttr;
      const hasAbility1 = abilityAttr & AbilityAttr.ABILITY_1;
      const hasAbility2 = abilityAttr & AbilityAttr.ABILITY_2;
      const hasHiddenAbility = abilityAttr & AbilityAttr.ABILITY_HIDDEN;
      // Due to a past bug it is possible that some Pokemon with a single ability have the ability2 flag
      // In this case, we only count ability2 as valid if ability1 was not unlocked, otherwise we ignore it
      const unlockedAbilities = [
        hasAbility1,
        speciesHasSingleAbility ? hasAbility2 && !hasAbility1 : hasAbility2,
        hasHiddenAbility,
      ];
      if (!unlockedAbilities[starterPreferences.abilityIndex]) {
        // requested ability wasn't unlocked, purging setting
        starterPreferences.abilityIndex = undefined;
      }
    }

    const selectedForm = starterPreferences.formIndex;
    if (
      selectedForm !== undefined
      && (!species.forms[selectedForm]?.isStarterSelectable
        || !(caughtAttr & globalScene.gameData.getFormAttr(selectedForm)))
    ) {
      // requested form wasn't unlocked/isn't a starter form, purging setting
      starterPreferences.formIndex = undefined;
    }

    if (starterPreferences.nature !== undefined) {
      const unlockedNatures = globalScene.gameData.getNaturesForAttr(dexEntry.natureAttr);
      if (unlockedNatures.indexOf(starterPreferences.nature as unknown as Nature) < 0) {
        // requested nature wasn't unlocked, purging setting
        starterPreferences.nature = undefined;
      }
    }

    if (
      starterPreferences.tera !== undefined
      && !(starterPreferences.tera === species.type1 || starterPreferences.tera === species?.type2)
    ) {
      starterPreferences.tera = species.type1;
    }

    return starterPreferences;
  }

  /** Set the selections for all filters to their default starting value */
  public resetFilters(): void {
    this.filterBar.setValsToDefault();
    this.resetCaughtDropdown();
  }

  /** Set default value for the caught dropdown, which only shows caught mons */
  public resetCaughtDropdown(): void {
    const caughtDropDown: DropDown = this.filterBar.getFilter(DropDownColumn.CAUGHT);

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
  protected setUpgradeAnimation(starter: StarterContainer): void {
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

    const numberOfStarters = this.filteredTeamMemberIds.length;
    const numOfRows = Math.ceil(numberOfStarters / COLUMNS);

    switch (button) {
      case Button.CANCEL:
        if (this.filterBar.openDropDown) {
          // CANCEL with a filter menu open > close it
          this.filterBar.toggleDropDown(this.filterBarCursor);
          success = true;
        } else if (!this.filterBar.getFilter(this.filterBar.getColumn(this.filterBarCursor)).hasDefaultValues()) {
          if (this.filterBar.getColumn(this.filterBarCursor) === DropDownColumn.CAUGHT) {
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

    const numberOfStarters = this.filteredTeamMemberIds.length;
    const onScreenFirstIndex = this.scrollCursor * COLUMNS;
    // this is the last starter index on the screen
    const onScreenLastIndex = Math.min(this.filteredTeamMemberIds.length - onScreenFirstIndex - 1, ROWS * COLUMNS - 1);
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

    const numberOfStarters = this.filteredTeamMemberIds.length;

    switch (button) {
      case Button.ACTION: {
        // This prevents repeated rapid button presses from adding duplicate starters to the party
        this.blockInput = true;

        if (this.partyTeamMemberIds.length >= 6) {
          this.blockInput = false;
          error = true;
          break;
        }

        const validTeamMembers = this.filteredTeamMemberIds.filter(starterId => {
          const [isDupe] = this.isInParty(starterId);
          const isCaught = setTeamMemberData(starterId).dexEntry.caughtAttr;
          return !isDupe && isCaught;
        });
        if (validTeamMembers.length === 0) {
          this.blockInput = false;
          error = true;
          break;
        }

        const randomTeamMemberId = validTeamMembers[Math.floor(Math.random() * validTeamMembers.length)];
        this.setTeamMember(randomTeamMemberId);

        // TODO: this might not be needed if we change .addToParty
        const dexAttr = getDexAttrFromPreferences(randomTeamMemberId, this.teamMemberPreferences[randomTeamMemberId]);
        const props = this.getStarterDexAttrPropsFromPreferences(randomTeamMemberId);
        const { abilityIndex, natureIndex, teraType } = getStarterDetailsFromPreferences(
          randomTeamMemberId,
          this.teamMemberPreferences[randomTeamMemberId],
        );
        const moveset = this.starterMoveset?.slice(0) as TeamMemberMoveset;
        const speciesForm = teamMemberDataRegistry.getPokemonSpeciesForm(randomTeamMemberId, props.formIndex);
        speciesForm
          .loadAssets(props.gender ?? Gender.NONBINARY, props.formIndex, props.shiny, props.variant, true)
          .then(() => {
            this.addToParty(randomTeamMemberId, dexAttr, abilityIndex, natureIndex, moveset, teraType);
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
    let cycled = false;
    const props = this.getStarterDexAttrPropsFromPreferences(this.lastTeamMemberId);
    this.teamMemberPreferences[this.lastTeamMemberId] ??= {};
    const starterPreferences = this.teamMemberPreferences[this.lastTeamMemberId]!;
    const lastStarter = teamMemberDataRegistry.getSpecies(this.lastTeamMemberId);
    const { dexEntry } = setTeamMemberData(this.lastTeamMemberId);

    switch (button) {
      case Button.CYCLE_SHINY: {
        if (!this.canCycle.shiny) {
          break;
        }

        if (starterPreferences.shiny === false) {
          // If not shiny, we change to shiny and get the proper default variant
          const newVariant = starterPreferences.variant ?? props.variant;
          this.setShinyAndVariant(this.lastTeamMemberId, true, newVariant);
          audioManager.playSound("se/sparkle");
          cycled = true;
          break;
        }

        // If shiny, we update the variant
        let newVariant = starterPreferences.variant ?? props.variant;
        do {
          newVariant = ((newVariant + 1) % 3) as Variant;
          if (newVariant === 0) {
            if (dexEntry.caughtAttr & DexAttr.DEFAULT_VARIANT) {
              break;
            }
          } else if (newVariant === 1) {
            if (dexEntry.caughtAttr & DexAttr.VARIANT_2) {
              break;
            }
          } else if (dexEntry.caughtAttr & DexAttr.VARIANT_3) {
            break;
          }
        } while (newVariant !== props.variant);

        // If we have run out of variants, go back to non shiny
        const isShiny = !(dexEntry.caughtAttr & DexAttr.NON_SHINY && newVariant <= props.variant);
        this.setShinyAndVariant(this.lastTeamMemberId, isShiny, newVariant);

        cycled = true;
        break;
      }
      case Button.CYCLE_FORM: {
        if (!this.canCycle.form) {
          break;
        }

        const formCount = lastStarter.forms.length;
        let newFormIndex = props.formIndex;
        do {
          newFormIndex = (newFormIndex + 1) % formCount;
          if (
            lastStarter.forms[newFormIndex].isStarterSelectable
            && dexEntry.caughtAttr & globalScene.gameData.getFormAttr(newFormIndex)
          ) {
            break;
          }
        } while (newFormIndex !== props.formIndex);
        this.setNewFormIndex(this.lastTeamMemberId, newFormIndex);
        cycled = true;
        break;
      }
      case Button.CYCLE_GENDER:
        if (this.canCycle.gender) {
          this.setNewGender(this.lastTeamMemberId, starterPreferences.gender ?? Gender.NONBINARY);
          cycled = true;
        }
        break;
      case Button.CYCLE_ABILITY: {
        if (!this.canCycle.ability) {
          break;
        }

        const abilityCount = lastStarter.getAbilityCount();
        const abilityAttr = setTeamMemberData(this.lastTeamMemberId).starterDataEntry.abilityAttr;
        const hasAbility1 = abilityAttr & AbilityAttr.ABILITY_1;
        const { abilityIndex } = getStarterDetailsFromPreferences(
          this.lastTeamMemberId,
          this.teamMemberPreferences[this.lastTeamMemberId],
        );
        let newAbilityIndex = abilityIndex;
        do {
          newAbilityIndex = (newAbilityIndex + 1) % abilityCount;
          if (newAbilityIndex === 0) {
            if (hasAbility1) {
              break;
            }
          } else if (newAbilityIndex === 1) {
            // If ability 1 and 2 are the same and ability 1 is unlocked, skip over ability 2
            if (lastStarter.ability1 === lastStarter.ability2 && hasAbility1) {
              newAbilityIndex = (newAbilityIndex + 1) % abilityCount;
            }
            break;
          } else if (abilityAttr & AbilityAttr.ABILITY_HIDDEN) {
            break;
          }
        } while (newAbilityIndex !== abilityIndex);
        this.setNewAbilityIndex(this.lastTeamMemberId, newAbilityIndex);
        cycled = true;
        break;
      }
      case Button.CYCLE_NATURE: {
        if (!this.canCycle.nature) {
          break;
        }

        const natures = globalScene.gameData.getNaturesForAttr(dexEntry?.natureAttr);
        const { natureIndex } = getStarterDetailsFromPreferences(
          this.lastTeamMemberId,
          this.teamMemberPreferences[this.lastTeamMemberId],
        );
        const newNature = natures[Phaser.Math.Wrap(natures.indexOf(natureIndex) + 1, 0, natures.length)];
        // store cycled nature as default
        this.setNewNature(this.lastTeamMemberId, newNature);
        cycled = true;
        break;
      }
      case Button.CYCLE_TERA: {
        if (!this.canCycle.tera) {
          break;
        }

        const speciesForm = teamMemberDataRegistry.getPokemonSpeciesForm(
          this.lastTeamMemberId,
          starterPreferences.formIndex ?? 0,
        );
        const { teraType } = getStarterDetailsFromPreferences(
          this.lastTeamMemberId,
          this.teamMemberPreferences[this.lastTeamMemberId],
        );
        const newTera =
          speciesForm.type1 === teraType && speciesForm.type2 != null ? speciesForm.type2 : speciesForm.type1;
        this.setNewTeraType(this.lastTeamMemberId, newTera);
        cycled = true;
        break;
      }
    }

    if (cycled) {
      this.setTeamMemberDetails(this.lastTeamMemberId);
    }

    return cycled;
  }

  /** Update the preferences for shiny and variant for a given species ID. */
  private setShinyAndVariant(teamMemberId: TeamMemberId, shiny: boolean, variant: Variant): void {
    this.teamMemberPreferences[teamMemberId] ??= {};
    this.originalStarterPreferences[teamMemberId] ??= {};
    this.teamMemberPreferences[teamMemberId].shiny = shiny;
    this.originalStarterPreferences[teamMemberId].shiny = shiny;
    this.teamMemberPreferences[teamMemberId].variant = variant;
    this.originalStarterPreferences[teamMemberId].variant = variant;
  }

  /** Update the preferences for the form index for a given species ID. */
  private setNewFormIndex(teamMemberId: TeamMemberId, formIndex: number): void {
    this.teamMemberPreferences[teamMemberId] ??= {};
    this.originalStarterPreferences[teamMemberId] ??= {};
    this.teamMemberPreferences[teamMemberId].formIndex = formIndex;
    this.originalStarterPreferences[teamMemberId].formIndex = formIndex;
    // Updating tera type for new form
    this.setNewTeraType(teamMemberId, teamMemberDataRegistry.getSpecies(teamMemberId).forms[formIndex].type1);
    // Updating gender for gendered forms
    if (teamMemberDataRegistry.getSpecies(teamMemberId)?.forms?.find(f => f.formKey === "female")) {
      this.setNewGender(teamMemberId, Gender.NONBINARY);
    }
  }

  /** Update the preferences for the gender for a given species ID. */
  private setNewGender(teamMemberId: TeamMemberId, gender: Gender): void {
    this.teamMemberPreferences[teamMemberId] ??= {};
    this.originalStarterPreferences[teamMemberId] ??= {};
    this.teamMemberPreferences[teamMemberId].gender = gender;
    this.originalStarterPreferences[teamMemberId].gender = gender;
    // Updating form for gendered forms
    if (teamMemberDataRegistry.getSpecies(teamMemberId)?.forms?.find(f => f.formKey === "female")) {
      const newFormIndex = gender === Gender.FEMALE ? 1 : 0;
      if (this.teamMemberPreferences[teamMemberId].formIndex !== newFormIndex) {
        this.setNewFormIndex(teamMemberId, newFormIndex);
      }
    }
  }

  /** Update the preferences for the ability index for a given species ID. */
  private setNewAbilityIndex(teamMemberId: TeamMemberId, abilityIndex: number): void {
    this.teamMemberPreferences[teamMemberId] ??= {};
    this.originalStarterPreferences[teamMemberId] ??= {};
    this.teamMemberPreferences[teamMemberId].abilityIndex = abilityIndex;
    this.originalStarterPreferences[teamMemberId].abilityIndex = abilityIndex;
  }

  /** Update the preferences for the nature for a given species ID. */
  private setNewNature(teamMemberId: TeamMemberId, nature: number): void {
    this.teamMemberPreferences[teamMemberId] ??= {};
    this.originalStarterPreferences[teamMemberId] ??= {};
    this.teamMemberPreferences[teamMemberId].nature = nature;
    this.originalStarterPreferences[teamMemberId].nature = nature;
  }

  /** Update the preferences for the tera type for a given species ID. */
  private setNewTeraType(teamMemberId: TeamMemberId, teraType: PokemonType): void {
    this.teamMemberPreferences[teamMemberId] ??= {};
    this.originalStarterPreferences[teamMemberId] ??= {};
    this.teamMemberPreferences[teamMemberId].tera = teraType;
    this.originalStarterPreferences[teamMemberId].tera = teraType;
  }

  /** Processes inputs while the cursor is on one of the party icons. */
  private processPartyIconInput(button: Button): boolean {
    let success = false;

    const numberOfStarters = this.filteredTeamMemberIds.length;
    const onScreenLastIndex = Math.min(this.filteredTeamMemberIds.length - 1, ROWS * COLUMNS - 1);

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

    const numberOfStarters = this.filteredTeamMemberIds.length;
    const numOfRows = Math.ceil(numberOfStarters / COLUMNS);
    const onScreenFirstIndex = this.scrollCursor * COLUMNS;
    const onScreenLastIndex = Math.min(this.filteredTeamMemberIds.length - onScreenFirstIndex - 1, ROWS * COLUMNS - 1);
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
        if (currentRow < numOfRows - 1 && this.cursor + 9 < this.filteredTeamMemberIds.length) {
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

    let starterContainer: StarterContainer;
    // The temporary, duplicated starter data to show info
    const starterData = setTeamMemberData(this.lastTeamMemberId).starterDataEntry;
    // The persistent starter data to apply e.g. candy upgrades
    const persistentStarterData = globalScene.gameData.starterData[this.lastTeamMemberId];
    // The sanitized starter preferences
    this.teamMemberPreferences[this.lastTeamMemberId] ??= {};
    const starterPreferences = this.teamMemberPreferences[this.lastTeamMemberId]!;
    // The original starter preferences
    this.originalStarterPreferences[this.lastTeamMemberId] ??= {};
    const originalStarterPreferences = this.originalStarterPreferences[this.lastTeamMemberId]!;

    // this gets the correct pokemon cursor depending on whether you're in the starter screen or the party icons
    if (this.partyCursorObj.visible) {
      // if species is in filtered starters, get the starter container from the filtered starters, it can be undefined if the species is not in the filtered starters
      starterContainer =
        this.starterContainers[
          this.starterContainers.findIndex(container => container.teamMemberId === this.lastTeamMemberId)
        ];
    } else {
      starterContainer = this.starterContainers[this.cursor];
    }

    const [isDupe, removeIndex]: [boolean, number] = this.isInParty(this.lastTeamMemberId);

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
          const dexAttr = getDexAttrFromPreferences(
            this.lastTeamMemberId,
            this.teamMemberPreferences[this.lastTeamMemberId],
          );
          const { teraType, abilityIndex, natureIndex } = getStarterDetailsFromPreferences(
            this.lastTeamMemberId,
            this.teamMemberPreferences[this.lastTeamMemberId],
          );
          this.addToParty(
            this.lastTeamMemberId,
            dexAttr,
            abilityIndex,
            natureIndex,
            // TODO: is this guaranteed not to be `undefined`? where?
            // if it's okay for it to be `undefined`, the param type for `addToParty` needs to be updated
            this.starterMoveset?.slice(0) as TeamMemberMoveset,
            teraType,
          );
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

    const starterMoves = getTeamMemberMoves(this.lastTeamMemberId);
    if (starterMoves.length > 1) {
      const showSwapOptions = (moveset: TeamMemberMoveset) => {
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
    if (this.canCycle.nature) {
      // if we could cycle natures, enable the improved nature menu
      const showNatureOptions = () => {
        this.blockInput = true;

        ui.setMode(UiMode.STARTER_SELECT).then(() => {
          ui.showText(i18next.t("starterSelectUiHandler:selectNature"), null, () => {
            const { dexEntry } = setTeamMemberData(this.lastTeamMemberId);
            const natures = globalScene.gameData.getNaturesForAttr(dexEntry?.natureAttr);
            ui.setModeWithoutClear(UiMode.OPTION_SELECT, {
              options: natures
                .map((n: Nature, _i: number) => {
                  const option: OptionSelectItem = {
                    label: getNatureName(n, true, true, true),
                    handler: () => {
                      this.setNewNature(this.lastTeamMemberId, n);
                      this.clearText();
                      ui.setMode(UiMode.STARTER_SELECT);
                      // set nature for starter
                      this.setTeamMemberDetails(this.lastTeamMemberId);
                      this.blockInput = false;
                      return true;
                    },
                  };
                  return option;
                })
                .concat({
                  label: i18next.t("menu:cancel"),
                  handler: () => {
                    this.clearText();
                    ui.setMode(UiMode.STARTER_SELECT);
                    this.blockInput = false;
                    return true;
                  },
                }),
              maxOptions: 8,
              yOffset: 29,
            } satisfies OptionSelectModeConfig as OptionSelectModeConfig);
          });
        });
      };
      options.push({
        label: i18next.t("starterSelectUiHandler:manageNature"),
        handler: () => {
          showNatureOptions();
          return true;
        },
      });
    }

    const passiveAttr = starterData.passiveAttr;
    if (passiveAttr & PassiveAttr.UNLOCKED) {
      // this is for enabling and disabling the passive
      const label = i18next.t(
        passiveAttr & PassiveAttr.ENABLED
          ? "starterSelectUiHandler:disablePassive"
          : "starterSelectUiHandler:enablePassive",
      );
      options.push({
        label,
        handler: () => {
          starterData.passiveAttr ^= PassiveAttr.ENABLED;
          persistentStarterData.passiveAttr ^= PassiveAttr.ENABLED;
          ui.setMode(UiMode.STARTER_SELECT);
          this.setTeamMemberDetails(this.lastTeamMemberId);
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
          if (starterContainer) {
            starterContainer.favoriteIcon.setVisible(starterPreferences.favorite);
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
          if (starterContainer) {
            starterContainer.favoriteIcon.setVisible(starterPreferences.favorite);
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
      const { dexEntry } = setTeamMemberData(this.lastTeamMemberId);
      if (!dexEntry?.caughtAttr) {
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
  private isInParty(teamMemberId: TeamMemberId): [isDupe: boolean, removeIndex: number] {
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

  private addToParty(
    teamMemberId: TeamMemberId,
    dexAttr: bigint,
    abilityIndex: number,
    nature: Nature,
    moveset: TeamMemberMoveset,
    teraType: PokemonType,
  ): void {
    const gender = Gender.FEMALE;
    const teamMember = teamMemberDataRegistry.getTeamMember(teamMemberId);
    const species = teamMemberDataRegistry.getSpecies(teamMemberId);
    const props = globalScene.gameData.getDexAttrProps(dexAttr);
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

    const { dexEntry, starterDataEntry } = setTeamMemberData(teamMemberId);

    const modifiedTeamMember = {
      teamMemberId,
      speciesId: species.speciesId,
      shiny: props.shiny,
      variant: props.variant,
      formIndex: props.formIndex,
      gender: props.gender,
      abilityIndex,
      passive: !(starterDataEntry.passiveAttr ^ (PassiveAttr.ENABLED | PassiveAttr.UNLOCKED)),
      nature,
      moveset,
      pokerus: false,
      nickname: this.teamMemberPreferences[teamMemberId]?.nickname,
      teraType,
      ivs: dexEntry.ivs,
      abilities: teamMember.abilities,
      moves: teamMember.moves,
    };

    this.partyTeamMembers.push(modifiedTeamMember);
    this.partyTeamMemberIds.push(teamMemberId);
    speciesDataRegistry.getPokemonSpeciesForm(species.speciesId, props.formIndex).cry();
    this.updateInstructions();
  }

  private updatePartyIcon(teamMemberId: TeamMemberId, index: number): void {
    const species = teamMemberDataRegistry.getSpecies(teamMemberId);
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

    const starterId = this.lastTeamMemberId;
    const existingMoveIndex = starterMoveset.indexOf(newMove);
    starterMoveset[targetIndex] = newMove;
    if (existingMoveIndex !== -1) {
      starterMoveset[existingMoveIndex] = previousMove;
    }
    const updatedMoveset = starterMoveset.slice() as TeamMemberMoveset;
    const starterDataEntry = globalScene.gameData.starterData[starterId];
    starterDataEntry.moveset = updatedMoveset;
    this.hasSwappedMoves = true;
    // TODO: we shouldn't need to call setStarterDetails here, since only the moveset is changing
    this.setTeamMemberDetails(this.lastTeamMemberId);
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
  private updateSelectedStarterMoveset(id: TeamMemberId): void {
    if (this.starterMoveset === null) {
      return;
    }

    for (const [index, teamMemberId] of this.partyTeamMemberIds.entries()) {
      if (teamMemberId === id) {
        this.partyTeamMembers[index].moves = this.starterMoveset;
      }
    }
  }

  protected updateInstructions(): void {
    const { dexEntry } = setTeamMemberData(this.lastTeamMemberId);
    this.instructionsContainer.updateInstructions(this.canCycle, !!dexEntry.caughtAttr, this.filterMode);
  }

  protected updateStarters(): void {
    this.scrollCursor = 0;

    this.filterBar.updateFilterLabels();

    this.filterStarters();

    this.starterSelectScrollBar.setTotalRows(Math.max(Math.ceil(this.filteredTeamMemberIds.length / 9), 1));
    this.starterSelectScrollBar.setScrollCursor(0);

    const sort = this.filterBar.getVals(DropDownColumn.SORT)[0];
    sortTeamMembers(this.filteredTeamMemberIds, sort.val, sort.dir);

    this.updateScroll();

    this.starterContainers.forEach(container => {
      this.setUpgradeAnimation(container);
    });
  }

  private filterStarters(): void {
    this.filteredTeamMemberIds = teamMemberDataRegistry.getAllTeamMemberIds().filter(teamMemberId => {
      const teamMemberData = teamMemberDataRegistry.getTeamMember(teamMemberId);
      const starterId = teamMemberData.speciesId;
      const species = speciesDataRegistry.getSpecies(starterId);
      const { dexEntry } = setTeamMemberData(teamMemberData.teamMemberId);
      const caughtAttr = dexEntry?.caughtAttr ?? BigInt(0);

      // First, ensure you have the caught attributes for the species else default to bigint 0
      const { starterDataEntry: starterData } = setTeamMemberData(teamMemberData.teamMemberId);
      const isStarterProgressable = Object.hasOwn(teamMemberMoveOptions, starterId);

      // Gen filter
      const fitsGen = this.filterBar.getVals(DropDownColumn.GEN).includes(species.generation);

      // Type filter
      const fitsType = this.filterBar
        .getVals(DropDownColumn.TYPES)
        .some(type => species.isOfType((type as number) - 1));

      // Caught / Shiny filter
      const isNonShinyCaught = !!(caughtAttr & DexAttr.NON_SHINY);
      const isUncaught = !isNonShinyCaught;
      const fitsCaught = this.filterBar.getVals(DropDownColumn.CAUGHT).some(caught => {
        if (caught === "NORMAL") {
          return isNonShinyCaught;
        }
        if (caught === "UNCAUGHT") {
          return isUncaught;
        }
        return false;
      });

      // Passive Filter
      const isPassiveUnlocked = starterData.passiveAttr > 0;
      const fitsPassive = this.filterBar.getVals(DropDownColumn.UNLOCKS).some(unlocks => {
        if (unlocks.val === "PASSIVE" && unlocks.state === DropDownState.ON) {
          return isPassiveUnlocked;
        }
        if (unlocks.val === "PASSIVE" && unlocks.state === DropDownState.EXCLUDE) {
          return isStarterProgressable && !isPassiveUnlocked;
        }
        if (unlocks.val === "PASSIVE" && unlocks.state === DropDownState.OFF) {
          return true;
        }
        return false;
      });

      // Favorite Filter
      const isFavorite = this.teamMemberPreferences[starterId]?.favorite ?? false;
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
      const hasWon = starterData.classicWinCount > 0;
      const hasNotWon = starterData.classicWinCount === 0;
      const isUndefined = starterData.classicWinCount === undefined;
      const fitsWin = this.filterBar.getVals(DropDownColumn.MISC).some(misc => {
        if (misc.val === "WIN" && misc.state === DropDownState.ON) {
          return hasWon;
        }
        if (misc.val === "WIN" && misc.state === DropDownState.EXCLUDE) {
          return hasNotWon || isUndefined;
        }
        if (misc.val === "WIN" && misc.state === DropDownState.OFF) {
          return true;
        }
        return false;
      });

      // HA Filter
      const speciesHasHiddenAbility =
        species.abilityHidden !== species.ability1 && species.abilityHidden !== AbilityId.NONE;
      const hasHA = starterData.abilityAttr & AbilityAttr.ABILITY_HIDDEN;
      const fitsHA = this.filterBar.getVals(DropDownColumn.MISC).some(misc => {
        if (misc.val === "HIDDEN_ABILITY" && misc.state === DropDownState.ON) {
          return hasHA;
        }
        if (misc.val === "HIDDEN_ABILITY" && misc.state === DropDownState.EXCLUDE) {
          return speciesHasHiddenAbility && !hasHA;
        }
        if (misc.val === "HIDDEN_ABILITY" && misc.state === DropDownState.OFF) {
          return true;
        }
        return false;
      });

      if (fitsGen && fitsType && fitsCaught && fitsPassive && fitsFavorite && fitsWin && fitsHA) {
        return true;
      }
      return false;
    });
  }

  protected updateScroll(): void {
    const onScreenFirstIndex = this.scrollCursor * COLUMNS;

    this.starterSelectScrollBar.setScrollCursor(this.scrollCursor);

    this.starterCursorObjs.forEach(cursor => cursor.setVisible(false));

    this.starterContainers.forEach((container, i) => {
      const offset_i = i + onScreenFirstIndex;
      if (offset_i >= this.filteredTeamMemberIds.length) {
        container.setVisible(false);
        return;
      }

      container.setVisible(true);

      const teamMemberId = this.filteredTeamMemberIds[offset_i];
      const species = speciesDataRegistry.getSpeciesFromTeamMemberId(teamMemberId);
      const { dexEntry, starterDataEntry } = setTeamMemberData(teamMemberId);
      const { gender, formIndex, shiny, variant } = this.getStarterDexAttrPropsFromPreferences(teamMemberId);

      container.setTeamMember(teamMemberId, { gender, formIndex, shiny, variant });

      const starterSprite = container.icon;
      starterSprite.setTexture(
        species.getIconAtlasKey(formIndex, shiny, variant),
        container.species.getIconId(gender ?? Gender.NONBINARY, formIndex, shiny, variant),
      );
      container.checkIconId(gender, formIndex, shiny, variant);

      const caughtAttr = dexEntry.caughtAttr;

      if (caughtAttr & species.getFullUnlocksData() || settings.general.dexForDevs) {
        container.icon.clearTint();
      } else if (dexEntry.seenAttr) {
        container.icon.setTint(0x808080);
      } else {
        container.icon.setTint(0);
      }

      if (this.partyTeamMemberIds.includes(teamMemberId)) {
        this.starterCursorObjs[this.partyTeamMemberIds.indexOf(teamMemberId)]
          .setPosition(container.x - 1, container.y + 1)
          .setVisible(true);
      }

      container.label.setVisible(true);
      const speciesVariants =
        teamMemberId && dexEntry.caughtAttr & DexAttr.SHINY
          ? [DexAttr.DEFAULT_VARIANT, DexAttr.VARIANT_2, DexAttr.VARIANT_3].filter(v => !!(dexEntry.caughtAttr & v))
          : [];
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

      container.starterPassiveBgs.setVisible(!!starterDataEntry.passiveAttr);
      container.hiddenAbilityIcon.setVisible(!!dexEntry.caughtAttr && !!(starterDataEntry.abilityAttr & 4));
      container.classicWinIcon
        .setVisible(starterDataEntry.classicWinCount > 0)
        .setTexture(dexEntry.ribbons.has(RibbonData.NUZLOCKE) ? "champion_ribbon_emerald" : "champion_ribbon");
      container.favoriteIcon.setVisible(this.teamMemberPreferences[teamMemberId]?.favorite ?? false);
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

      const teamMemberId = this.starterContainers[cursor].teamMemberId;

      if (teamMemberId) {
        this.setTeamMember(teamMemberId);
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
    if (this.lastTeamMemberId >= 0) {
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
   * @param teamMemberId - the id of the new starter
   */
  private setTeamMember(teamMemberId: TeamMemberId): void {
    const { dexEntry } = setTeamMemberData(teamMemberId);

    // Stop animation for the previously selected starter
    if (this.lastTeamMemberId && teamMemberDataRegistry.getSpecies(this.lastTeamMemberId)) {
      this.stopIconAnimation(this.oldCursor);
    }

    this.lastTeamMemberId = teamMemberId;

    // Set the cursors, using preferences if possible, default options otherwise
    this.starterSummary.setTeamMember(teamMemberId, this.teamMemberPreferences[teamMemberId] ?? {});

    if (dexEntry?.caughtAttr) {
      this.setTeamMemberDetails(teamMemberId, false);
      this.startIconAnimation(this.cursor);
    } else {
      this.resetStarterDetails();
    }
  }

  private setPartyStarter(teamMemberId: TeamMemberId): void {
    const { dexEntry } = setTeamMemberData(teamMemberId);

    // Set the cursors, using preferences if possible, default options otherwise
    this.starterSummary.setTeamMember(teamMemberId, this.teamMemberPreferences[teamMemberId] ?? {});

    if (dexEntry?.caughtAttr) {
      this.setTeamMemberDetails(teamMemberId, false);
    } else {
      this.resetStarterDetails();
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
    const teamMemberId = container.teamMemberId;
    let { gender, formIndex, shiny, variant } = this.getStarterDexAttrPropsFromPreferences(teamMemberId);
    gender = gender || Gender.NONBINARY;
    this.checkIconId(lastStarterIcon, container.species, gender, formIndex, shiny, variant);
    this.setUpgradeAnimation(container);
  }

  // TODO: check whether this is still necessary
  private resetStarterDetails(): void {
    this.starterMoveset = null;
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
  private setTeamMemberDetails(teamMemberId: TeamMemberId, save = true): void {
    const starterDetails = getStarterDetailsFromPreferences(teamMemberId, this.teamMemberPreferences[teamMemberId]);
    const { shiny, variant, gender, formIndex, natureIndex } = starterDetails;

    this.starterSummary.setStarterDetails(teamMemberId, starterDetails);

    const [isInParty, partyIndex]: [boolean, number] = this.isInParty(teamMemberId);
    if (isInParty) {
      this.updatePartyIcon(teamMemberId, partyIndex);
    }

    // If the starter is in the party, update the information in the party
    const teamMemberIndex = this.partyTeamMemberIds.indexOf(teamMemberId);
    if (teamMemberIndex > -1) {
      const teamMemberData = this.partyTeamMembers[teamMemberIndex];
      teamMemberData.gender = gender;
      teamMemberData.nature = natureIndex;
    }

    const currentContainer = this.starterContainers.find(p => p.teamMemberId === teamMemberId);
    if (currentContainer) {
      const starterSprite = currentContainer.icon;
      const species = teamMemberDataRegistry.getSpecies(teamMemberId);
      starterSprite.setTexture(
        species.getIconAtlasKey(formIndex, shiny, variant),
        species.getIconId(gender, formIndex, shiny, variant),
      );
      currentContainer.checkIconId(gender, formIndex, shiny, variant);
    }

    this.updateCanCycle(teamMemberId, formIndex);
    this.populateStarterMoveset(teamMemberId, formIndex);
    this.updateSelectedStarterMoveset(teamMemberId);
    this.updateInstructions();

    if (save) {
      saveStarterPreferences(this.originalStarterPreferences);
    }
  }

  /**
   * Update {@linkcode canCycle}, which determines whether buttons to cycle abilty, nature etc. should be visibile.
   *
   * @param starterId - the id of the current selected starter.
   * @param formIndex - the form index of the current starter.
   */
  private updateCanCycle(teamMemberId: TeamMemberId, formIndex = 0): void {
    const teamMemberData = teamMemberDataRegistry.getTeamMember(teamMemberId);
    const { dexEntry, starterDataEntry } = setTeamMemberData(teamMemberId);
    const caughtAttr = dexEntry.caughtAttr || BigInt(0);
    const abilityAttr = starterDataEntry.abilityAttr;
    const species = speciesDataRegistry.getSpecies(teamMemberData.speciesId);

    const isNonShinyCaught = !!(caughtAttr & DexAttr.NON_SHINY);
    const isShinyCaught = !!(caughtAttr & DexAttr.SHINY);

    const caughtVariants = [DexAttr.DEFAULT_VARIANT, DexAttr.VARIANT_2, DexAttr.VARIANT_3].filter(v => caughtAttr & v);
    this.canCycle.shiny = (isNonShinyCaught && isShinyCaught) || (isShinyCaught && caughtVariants.length > 1);

    const isMaleCaught = !!(caughtAttr & DexAttr.MALE);
    const isFemaleCaught = !!(caughtAttr & DexAttr.FEMALE);
    this.canCycle.gender = isMaleCaught && isFemaleCaught;

    const hasAbility1 = abilityAttr & AbilityAttr.ABILITY_1;
    let hasAbility2 = abilityAttr & AbilityAttr.ABILITY_2;
    const hasHiddenAbility = abilityAttr & AbilityAttr.ABILITY_HIDDEN;

    /*
     * Check for Pokemon with a single ability (at some point it was possible to catch them with their ability 2 attribute)
     * This prevents cycling between ability 1 and 2 if they are both unlocked and the same
     * but we still need to account for the possibility ability 1 was never unlocked and fallback on ability 2 in this case
     */
    // TODO: make a migrator for this
    if (hasAbility1 && hasAbility2 && species.ability1 === species.ability2) {
      hasAbility2 = 0;
    }

    this.canCycle.ability = [hasAbility1, hasAbility2, hasHiddenAbility].filter(a => a).length > 1;

    // TODO: can this be improved to not be `.filter().map().filter()`?
    this.canCycle.form =
      species.forms
        .filter(
          f => f.isStarterSelectable || !speciesDataRegistry.getFormChanges(species.speciesId)?.find(fc => fc.formKey),
        )
        .map((_, f) => dexEntry.caughtAttr & globalScene.gameData.getFormAttr(f))
        .filter(f => f).length > 1;

    this.canCycle.nature = globalScene.gameData.getNaturesForAttr(dexEntry.natureAttr).length > 1;

    this.canCycle.tera =
      this.allowTera && speciesDataRegistry.getPokemonSpeciesForm(species.speciesId, formIndex).type2 != null;
  }

  /**
   * Function called when a new starter is selected, used to populate its moveset.
   *
   * @param starterId - the id of the current selected starter.
   * @param formIndex - the form index of the current starter.
   */
  private populateStarterMoveset(teamMemberId: TeamMemberId, formIndex = 0): void {
    const { starterDataEntry } = setTeamMemberData(teamMemberId);

    this.starterMoveset = null;
    const starterMoves = getTeamMemberMoves(teamMemberId);

    const speciesMoveData = starterDataEntry.moveset;
    const moveData: TeamMemberMoveset | null = speciesMoveData
      ? Array.isArray(speciesMoveData)
        ? speciesMoveData
        : speciesMoveData[formIndex]
      : null;
    const availableStarterMoves = starterMoves.concat(
      Object.hasOwn(teamMemberMoveOptions, teamMemberId)
        ? teamMemberMoveOptions[teamMemberId].filter((_: any, em: number) => starterDataEntry.eggMoves & (1 << em))
        : [],
    );
    this.starterMoveset = (moveData || (starterMoves.slice(0, 4) as TeamMemberMoveset)).filter(m =>
      availableStarterMoves.find(sm => sm === m),
    ) as TeamMemberMoveset;
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
    ) as TeamMemberMoveset;

    if (!this.starterMoveset) {
      this.starterMoveset = starterMoves.slice(0, 4) as TeamMemberMoveset;
    }
    this.starterSummary.updateMoveset(this.starterMoveset, starterMoves.length);
    if (Object.hasOwn(teamMemberMoveOptions, teamMemberId)) {
      this.starterSummary.updateEggMoves(starterDataEntry.eggMoves);
    } else {
      this.starterSummary.hideEggMoves();
    }
  }

  /**
   * Removes a starter from the party.
   *
   * @param index - the index of the starter to remove in the party.
   */
  private popPartyStarter(index: number): void {
    this.partyTeamMemberIds.splice(index, 1);
    this.partyTeamMembers.splice(index, 1);

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
      if (this.filteredTeamMemberIds.length > 0) {
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
      const starters = this.partyTeamMembers.slice(0);
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

  private getStarterDexAttrPropsFromPreferences(teamMemberId: TeamMemberId): DexAttrProps {
    return getStarterDexAttrPropsFromPreferences(teamMemberId, this.teamMemberPreferences[teamMemberId]);
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

    saveStarterPreferences(this.originalStarterPreferences);

    this.clearStarterPreferences();
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

  /**
   * Clears this UI's starter preferences.
   *
   * Designed to be used for unit tests that utilize this UI.
   */
  public clearStarterPreferences(): void {
    this.teamMemberPreferences = {} as AllTeamMemberPreferences;
    this.originalStarterPreferences = {} as AllTeamMemberPreferences;
  }

  public override destroy(): void {
    // Without this the reference gets hung up and no startercontainers get GCd
    for (const container of this.starterContainers) {
      container.destroy();
    }
    this.starterContainers = [];
  }
}

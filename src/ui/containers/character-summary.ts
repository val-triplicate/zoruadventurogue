import { characterRegistry } from "#app/global-character-data-registry";
import { globalScene } from "#app/global-scene";
import { speciesRegistry } from "#app/global-species-data-registry";
import type { Character } from "#data/characters/character";
import { getAbility, getNature, getPassive, getTeraType } from "#data/characters/character-balance";
import { getFormIndex, getGender, getName, getSpeciesId, isShiny } from "#data/characters/character-identities";
import { allAbilities, allMoves } from "#data/data-lists";
import { GrowthRate, getGrowthRateColor } from "#data/exp";
import { type Gender, getGenderColor, getGenderSymbol } from "#data/gender";
import type { MoveSet } from "#data/moveset";
import { getNatureName } from "#data/nature";
import type { PokemonSpecies } from "#data/pokemon-species";
import { Passive } from "#enums/passive";
import { PokemonType } from "#enums/pokemon-type";
import { SpeciesId } from "#enums/species-id";
import { TextStyle } from "#enums/text-style";
import { getVariantIcon, getVariantTint, type Variant } from "#sprites/variant";
import { getIconProps } from "#types/character-state";
import { getStarterSelectTextSettings } from "#ui/starter-select-ui-utils";
import { addBBCodeTextObject, addTextObject, getTextColor } from "#ui/text";
import { getLocalizedSpriteKey, padInt } from "#utils/common";
import { toCamelCase, toTitleCase } from "#utils/strings";
import i18next from "i18next";
import type { GameObjects } from "phaser";
import type BBCodeText from "phaser3-rex-plugins/plugins/bbcodetext";

export class CharacterSummary extends Phaser.GameObjects.Container {
  private readonly pokemonSprite: Phaser.GameObjects.Sprite;
  private readonly pokemonNumberText: Phaser.GameObjects.Text;
  private readonly shinyOverlay: Phaser.GameObjects.Image;
  private readonly pokemonNameText: Phaser.GameObjects.Text;
  private pokemonGrowthRateLabelText: Phaser.GameObjects.Text;
  private pokemonGrowthRateText: Phaser.GameObjects.Text;
  private type1Icon: Phaser.GameObjects.Sprite;
  private type2Icon: Phaser.GameObjects.Sprite;
  private pokemonLuckLabelText: Phaser.GameObjects.Text;
  private pokemonLuckText: Phaser.GameObjects.Text;
  private pokemonGenderText: Phaser.GameObjects.Text;
  private readonly characterLockedText: Phaser.GameObjects.Text;
  private pokemonAbilityLabelText: Phaser.GameObjects.Text;
  private pokemonAbilityText: Phaser.GameObjects.Text;
  private pokemonPassiveLabelText: Phaser.GameObjects.Text;
  private pokemonPassiveText: Phaser.GameObjects.Text;
  private pokemonNatureLabelText: Phaser.GameObjects.Text;
  private pokemonNatureText: BBCodeText;
  private pokemonMovesContainer: Phaser.GameObjects.Container;
  private readonly activeMoveContainers: Phaser.GameObjects.Container[];
  private readonly activeMoveBgs: Phaser.GameObjects.NineSlice[];
  private readonly activeMoveLabels: Phaser.GameObjects.Text[];
  private readonly reserveMovesLabel: Phaser.GameObjects.Text;
  private readonly reserveMovesContainer: Phaser.GameObjects.Container;
  private readonly reserveMoveContainers: Phaser.GameObjects.Container[];
  private readonly reserveMoveBgs: Phaser.GameObjects.NineSlice[];
  private readonly reserveMoveLabels: Phaser.GameObjects.Text[];
  private pokemonShinyIcon: Phaser.GameObjects.Sprite;
  private pokemonPassiveDisabledIcon: Phaser.GameObjects.Sprite;
  private pokemonPassiveLockedIcon: Phaser.GameObjects.Sprite;
  private teraIcon: Phaser.GameObjects.Sprite;

  /** Which of the tooltips is displayed (on mouse hover) */
  private activeTooltip: "ABILITY" | "PASSIVE" | "CANDY" | undefined;

  /** Container for type, growth rate, luck */
  private readonly pokemonPermanentInfoContainer: GameObjects.Container;
  /** Container for numbers of caught pokémon, eggs */
  private readonly pokemonStatisticsContainer: GameObjects.Container;
  /** Container for everything that's a preference (abilities, nature, form...) */
  private readonly pokemonPreferencesContainer: GameObjects.Container;

  private speciesId: SpeciesId;

  constructor(x: number, y: number) {
    super(globalScene, x, y);

    this.pokemonSprite = globalScene.add //
      .sprite(53, 63, "pkmn__sub")
      .setPipeline(globalScene.spritePipeline, { tone: [0.0, 0.0, 0.0, 0.0], ignoreTimeTint: true });

    this.shinyOverlay = globalScene.add
      .image(6, 111, getLocalizedSpriteKey("summary_dexnb_label_overlay_shiny"))
      .setOrigin(0, 1)
      .setVisible(false); // Pixel text 'No' shiny

    this.pokemonNumberText = addTextObject(41, 1, "0000", TextStyle.SUMMARY_DEX_NUM) //
      .setOrigin(1, 0);

    this.pokemonNameText = addTextObject(6, 112, "", TextStyle.SUMMARY) //
      .setOrigin(0);

    this.characterLockedText = addTextObject(
      6,
      127,
      i18next.t("starterSelectUiHandler:locked"),
      TextStyle.SUMMARY_ALT,
      { fontSize: "56px" },
    ) //
      .setOrigin(0);

    this.activeMoveContainers = [];
    this.activeMoveBgs = [];
    this.activeMoveLabels = [];

    this.reserveMoveContainers = [];
    this.reserveMoveBgs = [];
    this.reserveMoveLabels = [];

    this.pokemonPreferencesContainer = this.setupPokemonPreferencesContainer();
    this.pokemonPermanentInfoContainer = this.setupPokemonPermanentInfoContainer();
    this.pokemonStatisticsContainer = this.setupPokemonStatisticsContainer();

    for (let m = 0; m < 4; m++) {
      const moveContainer = globalScene.add.container(0, 14 * m);

      const moveBg = globalScene.add //
        .nineslice(0, 0, "type_bgs", "unknown", 92, 14, 2, 2, 2, 2)
        .setOrigin(1, 0);

      const moveLabel = addTextObject(-moveBg.width / 2, 0, "-", TextStyle.MOVE_LABEL) //
        .setOrigin(0.5, 0);

      this.activeMoveBgs.push(moveBg);
      this.activeMoveLabels.push(moveLabel);

      moveContainer.add([moveBg, moveLabel]);

      this.activeMoveContainers.push(moveContainer);
      this.pokemonMovesContainer.add(moveContainer);
    }

    this.reserveMovesContainer = globalScene.add.container(102, 85).setScale(0.375);
    this.reserveMovesLabel = addTextObject(-46, 0, "Reserve Moves", TextStyle.WINDOW_ALT).setOrigin(0.5, 0);
    this.reserveMovesContainer.add(this.reserveMovesLabel);

    for (let m = 0; m < 4; m++) {
      const reserveMoveContainer = globalScene.add.container(0, 16 + 14 * m);

      const reserveMoveBg = globalScene.add //
        .nineslice(0, 0, "type_bgs", "unknown", 92, 14, 2, 2, 2, 2)
        .setOrigin(1, 0);

      const reserveMoveLabel = addTextObject(-reserveMoveBg.width / 2, 0, "???", TextStyle.MOVE_LABEL) //
        .setOrigin(0.5, 0);

      this.reserveMoveBgs.push(reserveMoveBg);
      this.reserveMoveLabels.push(reserveMoveLabel);

      reserveMoveContainer.add([reserveMoveBg, reserveMoveLabel]);

      this.reserveMoveContainers.push(reserveMoveContainer);
      this.reserveMovesContainer.add(reserveMoveContainer);
    }

    this.add([
      this.pokemonSprite,
      this.shinyOverlay,
      this.pokemonNumberText,
      this.pokemonNameText,
      this.characterLockedText,
      this.pokemonPreferencesContainer,
      this.pokemonPermanentInfoContainer,
      this.pokemonStatisticsContainer,
      this.pokemonMovesContainer,
      this.reserveMovesContainer,
    ]);
  }

  private setupPokemonPreferencesContainer(): GameObjects.Container {
    const pokemonPreferencesContainer = globalScene.add.container(0, 0);

    const textSettings = getStarterSelectTextSettings();

    // The position should be set per language
    const starterInfoXPos = textSettings?.starterInfoXPos ?? 31;
    const starterInfoYOffset = textSettings?.starterInfoYOffset ?? 0;

    // The font size should be set per language
    const starterInfoTextSize = textSettings?.starterInfoTextSize ?? 56;

    this.pokemonGenderText = addTextObject(96, 112, "", TextStyle.SUMMARY_ALT) //
      .setOrigin(0);

    this.pokemonAbilityLabelText = addTextObject(
      6,
      127 + starterInfoYOffset,
      i18next.t("starterSelectUiHandler:ability"),
      TextStyle.SUMMARY_ALT,
      { fontSize: starterInfoTextSize },
    ) //
      .setOrigin(0);

    this.pokemonAbilityText = addTextObject(starterInfoXPos, 127 + starterInfoYOffset, "", TextStyle.SUMMARY_ALT, {
      fontSize: starterInfoTextSize,
    })
      .setOrigin(0)
      .setInteractive(new Phaser.Geom.Rectangle(0, 0, 250, 55), Phaser.Geom.Rectangle.Contains);

    this.pokemonPassiveLabelText = addTextObject(
      6,
      136 + starterInfoYOffset,
      i18next.t("starterSelectUiHandler:passive"),
      TextStyle.SUMMARY_ALT,
      { fontSize: starterInfoTextSize },
    ) //
      .setOrigin(0);

    this.pokemonPassiveText = addTextObject(starterInfoXPos, 136 + starterInfoYOffset, "", TextStyle.SUMMARY_ALT, {
      fontSize: starterInfoTextSize,
    })
      .setOrigin(0)
      .setInteractive(new Phaser.Geom.Rectangle(0, 0, 250, 55), Phaser.Geom.Rectangle.Contains);

    this.pokemonPassiveDisabledIcon = globalScene.add
      .sprite(starterInfoXPos, 137 + starterInfoYOffset, "icon_stop")
      .setOrigin(0, 0.5)
      .setScale(0.35)
      .setVisible(false);

    this.pokemonPassiveLockedIcon = globalScene.add
      .sprite(starterInfoXPos, 137 + starterInfoYOffset, "icon_lock")
      .setOrigin(0, 0.5)
      .setScale(0.42, 0.38)
      .setVisible(false);

    this.pokemonNatureLabelText = addTextObject(
      6,
      145 + starterInfoYOffset,
      i18next.t("starterSelectUiHandler:nature"),
      TextStyle.SUMMARY_ALT,
      { fontSize: starterInfoTextSize },
    ) //
      .setOrigin(0);

    this.pokemonNatureText = addBBCodeTextObject(starterInfoXPos, 145 + starterInfoYOffset, "", TextStyle.SUMMARY_ALT, {
      fontSize: starterInfoTextSize,
    }) //
      .setOrigin(0);

    this.pokemonShinyIcon = globalScene.add //
      .sprite(12, 0, "shiny_icons")
      .setScale(0.5);

    this.teraIcon = globalScene.add //
      .sprite(85, 63, "button_tera")
      .setName("terastallize-icon")
      .setFrame("fire");

    pokemonPreferencesContainer.add([
      this.pokemonGenderText,
      this.pokemonAbilityLabelText,
      this.pokemonAbilityText,
      this.pokemonPassiveLabelText,
      this.pokemonPassiveText,
      this.pokemonPassiveDisabledIcon,
      this.pokemonPassiveLockedIcon,
      this.pokemonNatureLabelText,
      this.pokemonNatureText,
      this.pokemonShinyIcon,
      this.teraIcon,
    ]);

    return pokemonPreferencesContainer;
  }

  private setupPokemonPermanentInfoContainer(): GameObjects.Container {
    const pokemonPermanentInfoContainer = globalScene.add.container(0, 0);

    this.type1Icon = globalScene.add //
      .sprite(8, 98, getLocalizedSpriteKey("types"))
      .setScale(0.5)
      .setOrigin(0);
    this.type2Icon = globalScene.add //
      .sprite(26, 98, getLocalizedSpriteKey("types"))
      .setScale(0.5)
      .setOrigin(0);

    this.pokemonGrowthRateLabelText = addTextObject(
      8,
      106,
      i18next.t("starterSelectUiHandler:growthRate"),
      TextStyle.WINDOW_ALT,
      { fontSize: "36px" },
    ) //
      .setOrigin(0);

    this.pokemonGrowthRateText = addTextObject(34, 106, "", TextStyle.GROWTH_RATE_TYPE, { fontSize: "36px" }) //
      .setOrigin(0);

    this.pokemonLuckLabelText = addTextObject(8, 89, i18next.t("common:luckIndicator"), TextStyle.WINDOW_ALT, {
      fontSize: "56px",
    }) //
      .setOrigin(0);

    this.pokemonLuckText = addTextObject(
      8 + this.pokemonLuckLabelText.displayWidth + 2,
      89,
      "0",
      TextStyle.LUCK_VALUE,
      { fontSize: "56px" },
    ) //
      .setOrigin(0);

    pokemonPermanentInfoContainer.add([
      this.type1Icon,
      this.type2Icon,
      this.pokemonGrowthRateLabelText,
      this.pokemonGrowthRateText,
      this.pokemonLuckLabelText,
      this.pokemonLuckText,
    ]);

    return pokemonPermanentInfoContainer;
  }

  private setupPokemonStatisticsContainer(): GameObjects.Container {
    const pokemonStatisticsContainer = globalScene.add.container(0, 0);

    // Candy icon and count

    this.pokemonMovesContainer = globalScene.add //
      .container(102, 16)
      .setScale(0.375);

    return pokemonStatisticsContainer;
  }

  public applyChallengeVisibility(): void {
    // TODO: this should not be handled this way
    for (const container of this.reserveMoveContainers) {
      container.setVisible(true);
    }
    this.reserveMovesLabel.setVisible(true);
    // This is not enough, we need individual checks in setStarterSpecies too! :)
    this.pokemonPassiveDisabledIcon.setVisible(true);
    this.pokemonPassiveLabelText.setVisible(true);
    this.pokemonPassiveLockedIcon.setVisible(true);
    this.pokemonPassiveText.setVisible(true);
  }

  private setNameAndNumber(char: Character): void {
    this.pokemonNumberText.setText(padInt(getSpeciesId(char), 4));
    this.pokemonNameText.setText(getName(char));
  }

  protected setTypeIcons(type1: PokemonType, type2: PokemonType | null): void {
    this.type1Icon //
      .setVisible(true)
      .setFrame(PokemonType[type1].toLowerCase());

    if (type2 === null) {
      this.type2Icon.setVisible(false);
    } else {
      this.type2Icon //
        .setVisible(true)
        .setFrame(PokemonType[type2].toLowerCase());
    }
  }

  private setShinyIcon(shiny = true, variant: Variant = 0): void {
    this.pokemonShinyIcon //
      .setFrame(getVariantIcon(variant))
      .setTint(getVariantTint(variant))
      .setVisible(shiny);
  }

  public setNoStarter(): void {
    if (globalScene.ui.getTooltip().visible) {
      globalScene.ui.hideTooltip();
    }

    this.pokemonAbilityText.off("pointerover");
    this.pokemonPassiveText.off("pointerover");

    this.cleanStarterSprite();
  }

  public setCharacter(char: Character): void {
    const id = char.id;
    const saveData = characterRegistry.getSaveData(id);
    const preferences = characterRegistry.getPreferences(id);
    this.speciesId = getSpeciesId(char);
    const species = speciesRegistry.getSpecies(this.speciesId);

    this.pokemonAbilityText.off("pointerover");
    this.pokemonPassiveText.off("pointerover");

    if (saveData && saveData.isTeamUnlocked) {
      this.setNameAndNumber(char);
      this.characterLockedText.setVisible(false);
      this.pokemonPermanentInfoContainer.setVisible(true);
      this.pokemonStatisticsContainer.setVisible(true);

      let growthReadable = toTitleCase(GrowthRate[species.growthRate]);
      const growthAux = toCamelCase(growthReadable);
      if (i18next.exists("growth:" + growthAux)) {
        growthReadable = i18next.t(("growth:" + growthAux) as any);
      }
      this.pokemonGrowthRateText
        .setText(growthReadable)
        .setColor(getGrowthRateColor(species.growthRate))
        .setShadowColor(getGrowthRateColor(species.growthRate, true));

      this.pokemonShinyIcon.setY(104);
      const speciesForm = speciesRegistry.getPokemonSpeciesForm(species.speciesId, preferences.formIndex);
      this.setTypeIcons(speciesForm.type1, speciesForm.type2);

      this.pokemonSprite.clearTint();
      return;
    }

    this.cleanStarterSprite(char, saveData && saveData.isTeamUnlocked);

    const { gender, formIndex, shiny, variant } = getIconProps(char);

    this.updateSprite(species, gender, formIndex, shiny, variant);
    this.pokemonSprite //
      .setVisible(true)
      .setTint(saveData && saveData.isTeamUnlocked ? 0x808080 : 0x000000);
  }

  private cleanStarterSprite(char?: Character, isUnlocked = false): void {
    if (isUnlocked && char) {
      this.setNameAndNumber(char);
    } else {
      this.pokemonNumberText.setText(padInt(0, 4));
      this.pokemonNameText.setText(char ? "???" : "");
    }

    this.pokemonSprite.setVisible(!!char);
    this.characterLockedText.setVisible(!!char);

    this.pokemonPermanentInfoContainer.setVisible(false);
    this.pokemonStatisticsContainer.setVisible(false);
    this.resetSpeciesDetails();
  }

  private resetSpeciesDetails(): void {
    globalScene.ui.hideTooltip();

    this.pokemonPreferencesContainer.setVisible(false);

    this.shinyOverlay.setVisible(false);
    this.pokemonNumberText
      .setColor(getTextColor(TextStyle.SUMMARY))
      .setShadowColor(getTextColor(TextStyle.SUMMARY, true));

    for (let m = 0; m < 4; m++) {
      this.activeMoveContainers[m].setVisible(false);
    }
    this.reserveMovesContainer.setVisible(false);
  }

  public setStarterDetails(char: Character): void {
    const id = char.id;
    const species = speciesRegistry.getSpecies(getSpeciesId(char));
    const shiny = isShiny(char);
    const gender = getGender(char);
    const formIndex = getFormIndex(char);
    const teraType = getTeraType(char);

    this.pokemonSprite.setVisible(false);
    this.teraIcon.setVisible(false);

    this.pokemonPreferencesContainer.setVisible(true);

    this.shinyOverlay.setVisible(shiny);

    const numberTextStyle: TextStyle = shiny ? TextStyle.SUMMARY_DEX_NUM_GOLD : TextStyle.SUMMARY_DEX_NUM;
    this.pokemonNumberText.setColor(getTextColor(numberTextStyle, false));
    this.pokemonNumberText.setShadowColor(getTextColor(numberTextStyle, true));

    this.setShinyIcon(shiny);

    this.updateSprite(species, getGender(char), getFormIndex(char), shiny, 0);

    if (species.malePercent === null) {
      this.pokemonGenderText.setText("");
    } else {
      this.pokemonGenderText
        .setText(getGenderSymbol(gender))
        .setColor(getGenderColor(gender))
        .setShadowColor(getGenderColor(gender, true));
    }

    const ability = allAbilities[getAbility(char)];

    this.pokemonAbilityText
      .setText(ability.name)
      .setColor(getTextColor(TextStyle.SUMMARY_ALT))
      .setShadowColor(getTextColor(TextStyle.SUMMARY_ALT, true));

    if (this.pokemonAbilityText.visible) {
      if (this.activeTooltip === "ABILITY") {
        globalScene.ui.editTooltip(`${ability.name}`, `${ability.description}`);
      }

      this.pokemonAbilityText.on("pointerover", () => {
        globalScene.ui.showTooltip(`${ability.name}`, `${ability.description}`, true);
        this.activeTooltip = "ABILITY";
      });
      this.pokemonAbilityText.on("pointerout", () => {
        globalScene.ui.hideTooltip();
        this.activeTooltip = undefined;
      });
    }

    const preference = characterRegistry.getPreferences(id);

    this.updateMoveset(preference.activeMoves);
    this.updateReserveMoves(preference.reserveMoves);
    this.updatePassiveDisplay(char);

    this.pokemonNatureText.setText(getNatureName(getNature(char), true, true, false));

    const speciesForm = characterRegistry.getPokemonSpeciesForm(id, formIndex);
    this.setTypeIcons(speciesForm.type1, speciesForm.type2);

    let newTeraType = teraType;
    if (species.speciesId === SpeciesId.TERAPAGOS) {
      newTeraType = PokemonType.STELLAR;
    }
    this.teraIcon.setFrame(PokemonType[newTeraType].toLowerCase());
    this.teraIcon.setVisible(true);
  }

  private updatePassiveDisplay(char: Character): void {
    this.pokemonPassiveLabelText.setVisible(false);
    this.pokemonPassiveText.setVisible(false);
    this.pokemonPassiveDisabledIcon.setVisible(false);
    this.pokemonPassiveLockedIcon.setVisible(false);

    const saveData = characterRegistry.getSaveData(char.id);

    const passiveAbility = allAbilities[getPassive(char)];

    if (!passiveAbility) {
      if (this.activeTooltip === "PASSIVE") {
        globalScene.ui.hideTooltip();
      }
      return;
    }

    const isUnlocked = saveData?.isPassiveUnlocked || false;
    const isEnabled = isUnlocked && Passive.ENABLED;

    const textStyle = isUnlocked && isEnabled ? TextStyle.SUMMARY_ALT : TextStyle.SUMMARY_GRAY;
    const textAlpha = isUnlocked && isEnabled ? 1 : 0.5;

    this.pokemonPassiveLabelText
      .setVisible(true)
      .setColor(getTextColor(TextStyle.SUMMARY_ALT))
      .setShadowColor(getTextColor(TextStyle.SUMMARY_ALT, true));
    this.pokemonPassiveText
      .setVisible(true)
      .setText(passiveAbility.name)
      .setColor(getTextColor(textStyle))
      .setAlpha(textAlpha)
      .setShadowColor(getTextColor(textStyle, true));

    if (this.activeTooltip === "PASSIVE") {
      globalScene.ui.editTooltip(`${passiveAbility.name}`, `${passiveAbility.description}`);
    }

    if (this.pokemonPassiveText.visible) {
      this.pokemonPassiveText.on("pointerover", () => {
        globalScene.ui.showTooltip(`${passiveAbility.name}`, `${passiveAbility.description}`, true);
        this.activeTooltip = "PASSIVE";
      });
      this.pokemonPassiveText.on("pointerout", () => {
        globalScene.ui.hideTooltip();
        this.activeTooltip = undefined;
      });
    }

    const iconPosition = {
      x: this.pokemonPassiveText.x + this.pokemonPassiveText.displayWidth + 1,
      y: this.pokemonPassiveText.y + this.pokemonPassiveText.displayHeight / 2,
    };
    this.pokemonPassiveDisabledIcon.setVisible(isUnlocked && !isEnabled).setPosition(iconPosition.x, iconPosition.y);
    this.pokemonPassiveLockedIcon.setVisible(!isUnlocked).setPosition(iconPosition.x, iconPosition.y);
  }

  private updateSprite(
    species: PokemonSpecies,
    gender: Gender,
    formIndex: number,
    shiny: boolean,
    variant: Variant,
  ): void {
    species.loadAssets(gender, formIndex, shiny, variant, true).then(() => {
      this.pokemonSprite
        .play(species.getSpriteKey(gender, formIndex, shiny, variant))
        .setPipelineData("shiny", shiny)
        .setPipelineData("variant", variant)
        .setPipelineData("spriteKey", species.getSpriteKey(gender, formIndex, shiny, variant))
        .setVisible(true);
    });
  }

  public updateMoveset(moves: MoveSet): void {
    for (let i = 0; i < 4; i++) {
      const move = allMoves[moves[i]];
      this.activeMoveBgs[i].setFrame(PokemonType[move.type].toString().toLowerCase());
      this.activeMoveLabels[i].setText(move.name);
      this.activeMoveContainers[i].setVisible(true);
    }
  }

  public updateReserveMoves(moves: MoveSet): void {
    for (let i = 0; i < 4; i++) {
      const move = allMoves[moves[i]];
      this.reserveMoveBgs[i].setFrame(PokemonType[move.type].toString().toLowerCase());
      this.reserveMoveLabels[i].setText(move.name);
    }
    this.reserveMovesContainer.setVisible(true);
  }

  public clear(): void {
    globalScene.ui.hideTooltip();
    this.activeTooltip = undefined;
  }
}

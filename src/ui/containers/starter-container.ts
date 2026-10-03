import { characterRegistry } from "#app/global-character-data-registry";
import { globalScene } from "#app/global-scene";
import { Gender } from "#data/gender";
import type { PokemonSpecies } from "#data/pokemon-species";
import type { CharacterId } from "#enums/character-id";
import { TextStyle } from "#enums/text-style";
import type { Character } from "#types/pokemon-species";
import type { IconProps } from "#types/save-data";
import { addTextObject } from "#ui/text";

export class CharacterContainer extends Phaser.GameObjects.Container {
  public charId: CharacterId;
  public species: PokemonSpecies;
  public icon: Phaser.GameObjects.Sprite;
  public shinyIcons: Phaser.GameObjects.Image[] = [];
  public label: Phaser.GameObjects.Text;
  public starterPassiveBgs: Phaser.GameObjects.Image;
  public hiddenAbilityIcon: Phaser.GameObjects.Image;
  public favoriteIcon: Phaser.GameObjects.Image;
  public classicWinIcon: Phaser.GameObjects.Image;
  public cost = 0;

  constructor(character: Character) {
    super(globalScene, 0, 0);

    const defaultProps = globalScene.gameData.getDefaultIconProps(character.id);

    this.setCharacter(character.id, defaultProps);

    const starterPassiveBg = globalScene.add.image(2, 5, "passive_bg");
    starterPassiveBg.setOrigin(0, 0);
    starterPassiveBg.setScale(0.75);
    starterPassiveBg.setVisible(false);
    this.add(starterPassiveBg);
    this.starterPassiveBgs = starterPassiveBg;

    for (let i = 0; i < 3; i++) {
      const shinyIcon = globalScene.add.image(i * -3 + 12, 2, "shiny_star_small");
      shinyIcon.setScale(0.5);
      shinyIcon.setOrigin(0, 0);
      shinyIcon.setVisible(false);
      this.shinyIcons.push(shinyIcon);
    }
    this.add(this.shinyIcons);

    const label = addTextObject(1, 2, "0", TextStyle.WINDOW, { fontSize: "32px" });
    label.setShadowOffset(2, 2);
    label.setOrigin(0, 0);
    label.setVisible(false);
    this.add(label);
    this.label = label;

    const abilityIcon = globalScene.add.image(12, 7, "ha_capsule");
    abilityIcon.setOrigin(0, 0);
    abilityIcon.setScale(0.5);
    abilityIcon.setVisible(false);
    this.add(abilityIcon);
    this.hiddenAbilityIcon = abilityIcon;

    const favoriteIcon = globalScene.add.image(0, 7, "favorite");
    favoriteIcon.setOrigin(0, 0);
    favoriteIcon.setScale(0.5);
    favoriteIcon.setVisible(false);
    this.add(favoriteIcon);
    this.favoriteIcon = favoriteIcon;

    const classicWinIcon = globalScene.add.image(0, 12, "champion_ribbon");
    classicWinIcon.setOrigin(0, 0);
    classicWinIcon.setScale(0.5);
    classicWinIcon.setVisible(false);
    this.add(classicWinIcon);
    this.classicWinIcon = classicWinIcon;
  }

  public setCharacter(teamMemberId: CharacterId, props: IconProps) {
    this.species = characterRegistry.getSpecies(teamMemberId);

    let { shiny, formIndex, gender, variant } = props;

    gender = gender ?? Gender.NONBINARY;

    if (this.icon) {
      this.remove(this.icon);
      this.icon.destroy();
    }

    this.icon = globalScene.add
      .sprite(-2, 2, this.species.getIconAtlasKey(formIndex, shiny, variant))
      .setScale(0.5)
      .setOrigin(0)
      .setFrame(this.species.getIconId(gender, formIndex, shiny, variant))
      .setTint(0);
    this.checkIconId(gender, formIndex, shiny, variant);
    this.add(this.icon);

    [this.label, ...this.shinyIcons, this.hiddenAbilityIcon, this.favoriteIcon, this.classicWinIcon].forEach(icon => {
      if (icon) {
        this.bringToTop(icon);
      }
    });
  }

  checkIconId(female, formIndex, shiny, variant) {
    if (this.icon.frame.name !== this.species.getIconId(female, formIndex, shiny, variant)) {
      console.log(`${this.species.name}'s variant icon does not exist. Replacing with default.`);
      this.icon.setTexture(this.species.getIconAtlasKey(formIndex, false, variant));
      this.icon.setFrame(this.species.getIconId(female, formIndex, false, variant));
    }
  }
}

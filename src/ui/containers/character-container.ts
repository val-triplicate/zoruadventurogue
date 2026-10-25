import { globalScene } from "#app/global-scene";
import { speciesDataRegistry } from "#app/global-species-data-registry";
import type { CharacterId } from "#balance/characters/types/character-types-enums";
import type { Character } from "#balance/characters/types/character-types-objects";
import type { PokemonSpecies } from "#data/pokemon-species";
import { TextStyle } from "#enums/text-style";
import { addTextObject } from "#ui/text";

export class CharacterContainer extends Phaser.GameObjects.Container {
  public charId: CharacterId;
  public char: Character;
  public baseSpecies: PokemonSpecies;
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

    this.setCharacter(character);

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

  public setCharacter(char: Character) {
    this.char = char;
    this.charId = char.id;
    this.baseSpecies = speciesDataRegistry.getBaseSpecies(this.charId);

    if (this.icon) {
      this.remove(this.icon);
      this.icon.destroy();
    }

    this.icon = globalScene.add
      .sprite(-2, 2, this.baseSpecies.getIconAtlasKey())
      .setScale(0.5)
      .setOrigin(0)
      .setFrame(this.baseSpecies.getIconId(false, 0, false))
      .setTint(0);
    this.add(this.icon);

    [this.label, ...this.shinyIcons, this.hiddenAbilityIcon, this.favoriteIcon, this.classicWinIcon].forEach(icon => {
      if (icon) {
        this.bringToTop(icon);
      }
    });
  }
}

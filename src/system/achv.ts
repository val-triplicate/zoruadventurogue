import { globalScene } from "#app/global-scene";
import { settings } from "#app/global-settings-manager";
import { PlayerGender } from "#enums/player-gender";
import { getShortenedStatKey, Stat } from "#enums/stat";
import { TurnHeldItemTransferModifier } from "#modifiers/modifier";
import type { ConditionFn } from "#types/common";
import type { NumberHolder } from "#utils/common";
import type { ValueHolder } from "#utils/value-holder";
import i18next from "i18next";
import type { Modifier } from "typescript";

export enum AchvTier {
  COMMON,
  GREAT,
  ULTRA,
  ROGUE,
  MASTER,
}

function getGenderStr(): string {
  const genderIndex = settings.general.playerGender;
  const genderStr = PlayerGender[genderIndex].toLowerCase();
  return genderStr;
}

export class Achv {
  public localizationKey: string;
  public id: string;
  public iconImage: string;
  public score: number;

  public secret: boolean;
  public hasParent: boolean;
  public parentId: string;

  protected conditionFunc?: ConditionFn;

  constructor(localizationKey: string, iconImage: string, score: number, conditionFunc?: ConditionFn) {
    this.iconImage = iconImage;
    this.score = score;
    if (conditionFunc != null) {
      this.conditionFunc = conditionFunc;
    }
    this.localizationKey = localizationKey;
  }

  public get name(): string {
    // Localization key is used to get the name of the achievement
    return i18next.t(`achv:${this.localizationKey}.name`, { context: getGenderStr() });
  }

  public get description(): string {
    return i18next.t(`achv:${this.localizationKey}.description`, { context: getGenderStr() });
  }

  getIconImage(): string {
    return this.iconImage;
  }

  setSecret(hasParent?: boolean): this {
    this.secret = true;
    this.hasParent = !!hasParent;
    return this;
  }

  validate(args?: any[]): boolean {
    return !this.conditionFunc || this.conditionFunc(args);
  }

  getTier(): AchvTier {
    if (this.score >= 100) {
      return AchvTier.MASTER;
    }
    if (this.score >= 75) {
      return AchvTier.ROGUE;
    }
    if (this.score >= 50) {
      return AchvTier.ULTRA;
    }
    if (this.score >= 25) {
      return AchvTier.GREAT;
    }
    return AchvTier.COMMON;
  }
}

export class MoneyAchv extends Achv {
  private readonly moneyAmount: number;

  constructor(localizationKey: string, moneyAmount: number, iconImage: string, score: number) {
    super(localizationKey, iconImage, score, () => globalScene.money >= this.moneyAmount);
    this.moneyAmount = moneyAmount;
  }

  public override get description(): string {
    return i18next.t("achv:moneyAchv.description", {
      context: getGenderStr(),
      moneyAmount: this.moneyAmount.toLocaleString("en-US"),
    });
  }
}

export class RibbonAchv extends Achv {
  private readonly ribbonAmount: number;

  constructor(localizationKey: string, ribbonAmount: number, iconImage: string, score: number) {
    super(localizationKey, iconImage, score, () => globalScene.gameData.gameStats.ribbonsOwned >= this.ribbonAmount);
    this.ribbonAmount = ribbonAmount;
  }

  public override get description(): string {
    return i18next.t("achv:ribbonAchv.description", {
      context: getGenderStr(),
      ribbonAmount: this.ribbonAmount.toLocaleString("en-US"),
    });
  }
}

export class DamageAchv extends Achv {
  private readonly damageAmount: number;
  // intentionally overwriting base property
  declare protected readonly conditionFunc: ConditionFn<[number | NumberHolder]>;

  constructor(localizationKey: string, damageAmount: number, iconImage: string, score: number) {
    super(localizationKey, iconImage, score);
    this.conditionFunc = (args: [NumberHolder | number]) =>
      (typeof args[0] === "number" ? args[0] : args[0].value) >= this.damageAmount;
    this.damageAmount = damageAmount;
  }

  public override get description(): string {
    return i18next.t("achv:damageAchv.description", {
      context: getGenderStr(),
      damageAmount: this.damageAmount.toLocaleString("en-US"),
    });
  }
}

export class HealAchv extends Achv {
  private readonly healAmount: number;
  declare protected readonly conditionFunc: ConditionFn<[number | NumberHolder]>;

  constructor(localizationKey: string, healAmount: number, iconImage: string, score: number) {
    super(localizationKey, iconImage, score);
    this.conditionFunc = (args: [number | NumberHolder]) =>
      (typeof args[0] === "number" ? args[0] : args[0].value) >= this.healAmount;
    this.healAmount = healAmount;
  }

  public override get description(): string {
    return i18next.t("achv:healAchv.description", {
      context: getGenderStr(),
      healAmount: this.healAmount.toLocaleString("en-US"),
      HP: i18next.t(getShortenedStatKey(Stat.HP)),
    });
  }
}

export class LevelAchv extends Achv {
  private readonly level: number;

  constructor(localizationKey: string, level: number, iconImage: string, score: number) {
    super(
      localizationKey,
      iconImage,
      score,
      (args: [ValueHolder<number> | number, ...any[]]) =>
        (typeof args[0] === "number" ? args[0] : args[0].value) >= this.level,
    );
    this.level = level;
  }

  public get description(): string {
    return i18next.t("achv:levelAchv.description", {
      context: getGenderStr(),
      level: this.level,
    });
  }
}

export class ModifierAchv extends Achv {
  constructor(
    localizationKey: string,
    iconImage: string,
    score: number,
    modifierFunc: (modifier: Modifier) => boolean,
  ) {
    super(localizationKey, iconImage, score, (args: any[]) => modifierFunc(args[0] as Modifier));
  }
}

export const achvs = {
  CLASSIC_VICTORY: new Achv(
    "classicVictory",
    "classic_ribbon_default",
    250,
    () => globalScene.gameData.gameStats.sessionsWon === 0,
  ),
  _10_RIBBONS: new RibbonAchv("10Ribbons", 10, "common_ribbon", 50),
  _25_RIBBONS: new RibbonAchv("25Ribbons", 25, "great_ribbon", 75),
  _50_RIBBONS: new RibbonAchv("50Ribbons", 50, "ultra_ribbon", 100),
  _75_RIBBONS: new RibbonAchv("75Ribbons", 75, "rogue_ribbon", 125),
  _100_RIBBONS: new RibbonAchv("100Ribbons", 100, "master_ribbon", 150),
  _10K_MONEY: new MoneyAchv("10KMoney", 10000, "nugget", 25),
  _100K_MONEY: new MoneyAchv("100KMoney", 100000, "big_nugget", 25).setSecret(true),
  _1M_MONEY: new MoneyAchv("1MMoney", 1000000, "relic_gold", 50).setSecret(true),
  _10M_MONEY: new MoneyAchv("10MMoney", 10000000, "coin_case", 50).setSecret(true),
  _250_DMG: new DamageAchv("250Dmg", 250, "lucky_punch", 25),
  _1000_DMG: new DamageAchv("1000Dmg", 1000, "lucky_punch_great", 25).setSecret(true),
  _2500_DMG: new DamageAchv("2500Dmg", 2500, "lucky_punch_ultra", 50).setSecret(true),
  _10000_DMG: new DamageAchv("10000Dmg", 10000, "lucky_punch_master", 50).setSecret(true),
  _250_HEAL: new HealAchv("250Heal", 250, "potion", 25),
  _1000_HEAL: new HealAchv("1000Heal", 1000, "super_potion", 25).setSecret(true),
  _2500_HEAL: new HealAchv("2500Heal", 2500, "hyper_potion", 50).setSecret(true),
  _10000_HEAL: new HealAchv("10000Heal", 10000, "max_potion", 50).setSecret(true),
  LV_100: new LevelAchv("lv100", 100, "rare_candy", 25).setSecret(),
  LV_250: new LevelAchv("lv250", 250, "rarer_candy", 25).setSecret(true),
  LV_1000: new LevelAchv("lv1000", 1000, "candy_jar", 50).setSecret(true),
  TRANSFER_MAX_STAT_STAGE: new Achv("transferMaxStatStage", "baton", 25),
  MAX_FRIENDSHIP: new Achv("maxFriendship", "ribbon_friendship", 25),
  MEGA_EVOLVE: new Achv("megaEvolve", "mega_bracelet", 50),
  GIGANTAMAX: new Achv("gigantamax", "dynamax_band", 50),
  TERASTALLIZE: new Achv("terastallize", "tera_orb", 25),
  STELLAR_TERASTALLIZE: new Achv("stellarTerastallize", "stellar_tera_shard", 25).setSecret(true),
  SPLICE: new Achv("splice", "dna_splicers", 50),
  MINI_BLACK_HOLE: new ModifierAchv(
    "miniBlackHole",
    "mini_black_hole",
    25,
    modifier => modifier instanceof TurnHeldItemTransferModifier,
  ).setSecret(),
  HIDDEN_ABILITY: new Achv("hiddenAbility", "ability_charm", 25),
  PERFECT_IVS: new Achv("perfectIvs", "blunder_policy", 25),
  SEE_SHINY: new Achv("seeShiny", "pb_gold", 50),
  SHINY_PARTY: new Achv("shinyParty", "shiny_charm", 50).setSecret(true),
  CATCH_SUB_LEGENDARY: new Achv("catchSubLegendary", "rb", 50).setSecret(),
  CATCH_MYTHICAL: new Achv("catchMythical", "strange_ball", 75).setSecret(),
  CATCH_LEGENDARY: new Achv("catchLegendary", "mb", 100).setSecret(),
  HATCH_SUB_LEGENDARY: new Achv("hatchSubLegendary", "epic_egg", 50).setSecret(),
  HATCH_MYTHICAL: new Achv("hatchMythical", "manaphy_egg", 50).setSecret(),
  HATCH_LEGENDARY: new Achv("hatchLegendary", "legendary_egg", 100).setSecret(),
  HATCH_SHINY: new Achv("hatchShiny", "rogue_egg", 100).setSecret(),
  DAILY_VICTORY: new Achv("dailyVictory", "calendar", 100),
  BREEDERS_IN_SPACE: new Achv("breedersInSpace", "moon_stone", 50).setSecret(),
};

export function initAchievements() {
  const achvKeys = Object.keys(achvs);
  achvKeys.forEach((a, i) => {
    achvs[a].id = a;
    if (achvs[a].hasParent) {
      achvs[a].parentId = achvKeys[i - 1];
    }
  });
}

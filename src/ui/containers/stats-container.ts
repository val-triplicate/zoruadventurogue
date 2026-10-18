import { globalScene } from "#app/global-scene";
import type { BaseStats } from "#data/characters/types/character-types-objects";
import { getStatKey, PERMANENT_STATS } from "#enums/stat";
import { TextStyle } from "#enums/text-style";
import { addBBCodeTextObject, addTextObject, getTextColor } from "#ui/text";
import i18next from "i18next";
import type BBCodeText from "phaser3-rex-plugins/plugins/gameobjects/tagtext/bbcodetext/BBCodeText";

const statChartSize = 24;
const statChartStatCoordMultipliers = [
  [0, -1],
  [0.825, -0.5],
  [0.825, 0.5],
  [-0.825, -0.5],
  [-0.825, 0.5],
  [0, 1],
];
const speedLabelOffset = -3;
const sideLabelOffset = 1;
const statLabelOffset = [0, sideLabelOffset, -sideLabelOffset, sideLabelOffset, -sideLabelOffset, speedLabelOffset];
const statChartLabelyOffset = [0, 5, 0, 5, 0, 0]; // doing this so attack does not overlap with (+N)
const statChartStatIndexes = [0, 1, 2, 5, 4, 3]; // swap special attack and speed

const defaultStatChartData: number[] = new Array(12).fill(0);

export class StatsContainer extends Phaser.GameObjects.Container {
  private readonly showDiff: boolean;
  private statsCache: number[];
  private statChart: Phaser.GameObjects.Polygon;
  private statValueTexts: BBCodeText[];

  constructor(x: number, y: number, showDiff = false) {
    super(globalScene, x, y);

    this.showDiff = showDiff;

    this.setup();
  }

  private setup(): void {
    this.setName("stats");
    // TODO: ...
    const ivChartBgData = new Array(6)
      .fill(null)
      .flatMap((_, i: number) => [
        statChartSize * statChartStatCoordMultipliers[statChartStatIndexes[i]][0],
        statChartSize * statChartStatCoordMultipliers[statChartStatIndexes[i]][1],
      ]);
    const ivChartBg = globalScene.add //
      .polygon(48, 44, ivChartBgData, 0xd8e0f0, 0.625)
      .setOrigin(0);

    const ivChartBorder = globalScene.add
      .polygon(ivChartBg.x, ivChartBg.y, ivChartBgData)
      .setStrokeStyle(1, 0x484050)
      .setOrigin(0);

    const ivChartBgLines = [
      [0, -1, 0, 1],
      [-0.825, -0.5, 0.825, 0.5],
      [0.825, -0.5, -0.825, 0.5],
    ].map(coords => {
      const line = new Phaser.GameObjects.Line(
        globalScene,
        ivChartBg.x,
        ivChartBg.y,
        statChartSize * coords[0],
        statChartSize * coords[1],
        statChartSize * coords[2],
        statChartSize * coords[3],
        0xffffff,
      )
        .setLineWidth(0.5)
        .setOrigin(0);
      return line;
    });

    this.statChart = globalScene.add //
      .polygon(ivChartBg.x, ivChartBg.y, defaultStatChartData, 0x98d8a0, 0.75)
      .setOrigin(0);

    this.add(ivChartBg);
    ivChartBgLines.map(l => this.add(l));
    this.add(this.statChart);
    this.add(ivChartBorder);

    this.statValueTexts = [];

    for (const s of PERMANENT_STATS) {
      const statLabel = addTextObject(
        ivChartBg.x
          + statChartSize * statChartStatCoordMultipliers[s][0] * 1.325
          + (this.showDiff ? 0 : statLabelOffset[s]),
        ivChartBg.y
          + statChartSize * statChartStatCoordMultipliers[s][1] * 1.325
          - 4
          + (this.showDiff ? 0 : statChartLabelyOffset[s]),
        i18next.t(getStatKey(s)),
        TextStyle.STATS_HEXAGON,
      );
      statLabel.setOrigin(0.5);

      this.statValueTexts[s] = addBBCodeTextObject(
        statLabel.x - (this.showDiff ? 0 : statLabelOffset[s]),
        statLabel.y + 8,
        "0",
        TextStyle.STATS_HEXAGON,
      );
      this.statValueTexts[s].setOrigin(0.5);

      this.add(statLabel);
      this.add(this.statValueTexts[s]);
    }
  }

  public updateStats(stats: BaseStats, canonStats?: BaseStats): void {
    if (!stats) {
      this.statsCache = defaultStatChartData;
      this.statChart.setTo(defaultStatChartData);
      return;
    }

    const statChartData = new Array(6)
      .fill(null)
      .flatMap((_, i) => [
        (stats[statChartStatIndexes[i]] / 31)
          * statChartSize
          * statChartStatCoordMultipliers[statChartStatIndexes[i]][0],
        (stats[statChartStatIndexes[i]] / 31)
          * statChartSize
          * statChartStatCoordMultipliers[statChartStatIndexes[i]][1],
      ]);
    const lastStatChartData = this.statsCache || defaultStatChartData;
    const increasedStatColor: string = getTextColor(TextStyle.SUMMARY_BLUE, false);
    const decreasedStatColor: string = getTextColor(TextStyle.SUMMARY_RED, false);
    this.statsCache = statChartData.slice(0);

    this.statValueTexts.forEach((text: BBCodeText, index: number) => {
      let label = "";

      // Check to see if IVs are 31, if so change the text style to gold, otherwise leave them be.
      if (stats[index] === 31) {
        label += `[color=${increasedStatColor}][shadow]${stats[index].toString()}[/shadow][/color]`;
      } else if (stats[index] < 2) {
        label += `[color=${decreasedStatColor}][shadow]${stats[index].toString()}[/shadow][/color]`;
      } else {
        label = stats[index].toString();
      }
      text.setText(`[shadow]${label}[/shadow]`);
    });

    const newColor = stats.every(iv => iv === 31) ? Number.parseInt(increasedStatColor.slice(1), 16) : 0x98d8a0;
    const oldColor = this.statChart.fillColor;
    const interpolateColor =
      oldColor === newColor
        ? null
        : [Phaser.Display.Color.IntegerToColor(oldColor), Phaser.Display.Color.IntegerToColor(newColor)];

    globalScene.tweens.addCounter({
      from: 0,
      to: 1,
      duration: 1000,
      ease: "Cubic.easeOut",
      onUpdate: (tween: Phaser.Tweens.Tween) => {
        const progress = tween.getValue() ?? 1;
        const interpolatedData = statChartData.map(
          (v: number, i: number) => v * progress + lastStatChartData[i] * (1 - progress),
        );
        if (interpolateColor) {
          this.statChart.setFillStyle(
            Phaser.Display.Color.ValueToColor(
              Phaser.Display.Color.Interpolate.ColorWithColor(interpolateColor[0], interpolateColor[1], 1, progress),
            ).color,
            0.75,
          );
        }
        this.statChart.setTo(interpolatedData);
      },
    });
  }
}

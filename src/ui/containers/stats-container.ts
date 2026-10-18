import { globalScene } from "#app/global-scene";
import type { BaseStats } from "#data/characters/types/character-types-objects";
import { getStatKey, PERMANENT_STATS } from "#enums/stat";
import { TextStyle } from "#enums/text-style";
import { addBBCodeTextObject, addTextObject, getTextColor } from "#ui/text";
import i18next from "i18next";
import type BBCodeText from "phaser3-rex-plugins/plugins/gameobjects/tagtext/bbcodetext/BBCodeText";

import NumberTweenBuilderConfig = Phaser.Types.Tweens.NumberTweenBuilderConfig;
import Polygon = Phaser.GameObjects.Polygon;
import Container = Phaser.GameObjects.Container;

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

export class StatsContainer extends Container {
  private readonly showDiff: boolean;
  private customStatsCache: number[];
  private canonStatsCache: number[];
  private canonStatsChart: Polygon;
  private customStatsChart: Polygon;
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
    const chartBg = globalScene.add //
      .polygon(48, 44, ivChartBgData, 0xd8e0f0, 0.625)
      .setOrigin(0);

    const chartBorder = globalScene.add
      .polygon(chartBg.x, chartBg.y, ivChartBgData)
      .setStrokeStyle(1, 0x484050)
      .setOrigin(0);

    const chartBgLines = [
      [0, -1, 0, 1],
      [-0.825, -0.5, 0.825, 0.5],
      [0.825, -0.5, -0.825, 0.5],
    ].map(coords => {
      return new Phaser.GameObjects.Line(
        globalScene,
        chartBg.x,
        chartBg.y,
        statChartSize * coords[0],
        statChartSize * coords[1],
        statChartSize * coords[2],
        statChartSize * coords[3],
        0xffffff,
      )
        .setLineWidth(0.5)
        .setOrigin(0);
    });

    this.canonStatsChart = globalScene.add
      .polygon(chartBg.x, chartBg.y, defaultStatChartData, 0x000000, 0.75)
      .setOrigin(0);
    this.customStatsChart = globalScene.add
      .polygon(chartBg.x, chartBg.y, defaultStatChartData, 0x98d8a0, 0.75)
      .setOrigin(0);

    this.add(chartBg);
    this.add(this.canonStatsChart);
    this.add(this.customStatsChart);
    this.add(chartBorder);
    chartBgLines.map(l => this.add(l));

    this.statValueTexts = [];

    for (const s of PERMANENT_STATS) {
      const statLabel = addTextObject(
        chartBg.x
          + statChartSize * statChartStatCoordMultipliers[s][0] * 1.325
          + (this.showDiff ? 0 : statLabelOffset[s]),
        chartBg.y
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

  private statsAsArray(stats: BaseStats): number[] {
    return new Array(6)
      .fill(null)
      .flatMap((_, i) => [
        (stats[statChartStatIndexes[i]] / 255)
          * statChartSize
          * statChartStatCoordMultipliers[statChartStatIndexes[i]][0],
        (stats[statChartStatIndexes[i]] / 255)
          * statChartSize
          * statChartStatCoordMultipliers[statChartStatIndexes[i]][1],
      ]);
  }

  public updateStats(customStats: BaseStats, canonStats: BaseStats): void {
    const customStatData = this.statsAsArray(customStats);
    const canonStatData = this.statsAsArray(canonStats);
    const lastCustomStatData = this.customStatsCache || defaultStatChartData.slice();
    const lastCanonStatData = this.canonStatsCache || defaultStatChartData.slice();
    this.customStatsCache = customStatData.slice(0);
    this.canonStatsCache = canonStatData.slice(0);

    this.statValueTexts.forEach((text: BBCodeText, index: number) => {
      text.setText(this.coloredStatText(customStats[index], canonStats[index]));
    });

    globalScene.tweens.addCounter(this.tweenCounter(canonStatData, lastCanonStatData, this.canonStatsChart, 0x000000));
    globalScene.tweens.addCounter(
      this.tweenCounter(customStatData, lastCustomStatData, this.customStatsChart, 0xffaa00),
    );
  }

  private coloredStatText(customStat: number, canonStat: number): string {
    const increasedStatColor: string = getTextColor(TextStyle.SUMMARY_BLUE, false);
    const decreasedStatColor: string = getTextColor(TextStyle.SUMMARY_RED, false);

    if (customStat === canonStat) {
      return `[shadow]${customStat.toString()}[/shadow]`;
    }
    const statString = `${customStat.toString()} (${canonStat.toString()})`;
    const color = customStat > canonStat ? increasedStatColor : decreasedStatColor;
    return `[shadow][color=${color}][shadow]${statString}[/shadow][/color][/shadow]`;
  }

  private tweenCounter(
    statData: number[],
    prevStatData: number[],
    chart: Polygon,
    colorCode: number,
  ): NumberTweenBuilderConfig {
    const oldColor = chart.fillColor;
    const interpolateColor =
      oldColor === colorCode
        ? null
        : [Phaser.Display.Color.IntegerToColor(oldColor), Phaser.Display.Color.IntegerToColor(colorCode)];

    return {
      from: 0,
      to: 1,
      duration: 1000,
      ease: "Cubic.easeOut",
      onUpdate: (tween: Phaser.Tweens.Tween) => {
        const progress = tween.getValue() ?? 1;
        const interpolatedData = statData.map(
          (v: number, i: number) => v * progress + prevStatData[i] * (1 - progress),
        );
        if (interpolateColor) {
          chart.setFillStyle(
            Phaser.Display.Color.ValueToColor(
              Phaser.Display.Color.Interpolate.ColorWithColor(interpolateColor[0], interpolateColor[1], 1, progress),
            ).color,
            0.75,
          );
        }
        chart.setTo(interpolatedData);
      },
    };
  }
}

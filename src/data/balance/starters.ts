import { IS_TEST } from "#constants/app-constants";

export const POKERUS_STARTER_COUNT = 5;

interface StarterCandyCosts {
  /** The candy cost to unlock the starter's passive ability */
  readonly passive: number;
  /** The candy costs to reduce the starter's point cost */
  readonly costReduction: readonly [number, number];
  /** The costs to buy a same-species egg */
  readonly eggCosts: readonly [number, ...number[]];
  /** The number of eggs required to hatch to reduce the cost for buying more eggs */
  readonly eggCostReductionThresholds: readonly number[];
}

const allStarterCandyCosts: readonly StarterCandyCosts[] = [
  { passive: 40, costReduction: [25, 60], eggCosts: [30, 27, 22, 15], eggCostReductionThresholds: [20, 40, 80] }, // 1 Cost
  { passive: 40, costReduction: [25, 60], eggCosts: [30, 27, 22, 15], eggCostReductionThresholds: [20, 40, 80] }, // 2 Cost
  { passive: 35, costReduction: [20, 50], eggCosts: [25, 22, 18, 12], eggCostReductionThresholds: [20, 40, 80] }, // 3 Cost
  { passive: 30, costReduction: [15, 40], eggCosts: [20, 18, 15, 10], eggCostReductionThresholds: [15, 30, 60] }, // 4 Cost
  { passive: 25, costReduction: [12, 35], eggCosts: [18, 16, 13, 9], eggCostReductionThresholds: [15, 30, 60] }, // 5 Cost
  { passive: 20, costReduction: [10, 30], eggCosts: [15, 13, 11, 7], eggCostReductionThresholds: [15, 30, 60] }, // 6 Cost
  { passive: 15, costReduction: [8, 20], eggCosts: [12, 10, 9, 6], eggCostReductionThresholds: [10, 20, 40] }, // 7 Cost
  { passive: 10, costReduction: [5, 15], eggCosts: [10, 9, 7, 5], eggCostReductionThresholds: [10, 20, 40] }, // 8 Cost
  { passive: 10, costReduction: [5, 15], eggCosts: [10, 9, 7, 5], eggCostReductionThresholds: [10, 20, 40] }, // 9 Cost
  { passive: 10, costReduction: [5, 15], eggCosts: [10, 9, 7, 5], eggCostReductionThresholds: [8, 16, 32] }, // 10 Cost
];

/**
 * ⚠️ This is used for internal testing purposes only and will not be populated outside of the test environment.
 * @internal
 */
export const __TEST_allStarterCandyCosts: readonly StarterCandyCosts[] = [];

if (IS_TEST) {
  for (const starterCandyCosts of allStarterCandyCosts) {
    // @ts-expect-error: done this way to keep it `readonly`
    __TEST_allStarterCandyCosts.push(starterCandyCosts);
  }
}

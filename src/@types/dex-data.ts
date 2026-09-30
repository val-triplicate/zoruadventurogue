import type { RibbonData } from "#system/ribbon-data";

export interface DexData {
  [key: number]: DexEntry;
}

export interface TeamDexData {
  [key: number]: TeamDexEntry;
}

export interface DexEntry {
  seenAttr: bigint;
  caughtAttr: bigint;
  natureAttr: number;
  seenCount: number;
  caughtCount: number;
  hatchedCount: number;
  ivs: number[];
  ribbons: RibbonData;
}

export interface TeamDexEntry {
  isUnlocked: boolean;
  runCount: bigint;
  winCount: bigint;
  abilitiesUnlocked: boolean;
  passivesUnlocked: boolean;
}

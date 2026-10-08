import { LearnableMoveSource } from "#enums/learnable-move-source";

export function getLearnableMoveSourceIconFrame(source: LearnableMoveSource, tmType?: string | null): string {
  switch (source) {
    case LearnableMoveSource.EGG:
      return "common_egg";
    case LearnableMoveSource.PREVO:
    case LearnableMoveSource.RELEARN:
    case LearnableMoveSource.EVOLUTION:
      return "big_mushroom";
    case LearnableMoveSource.TM:
      return `tm_${tmType ?? "normal"}`;
    default:
      return "unknown";
  }
}

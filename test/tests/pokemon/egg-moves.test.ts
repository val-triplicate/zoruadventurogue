import { speciesDataRegistry } from "#app/global-species-data-registry";
import { teamMemberMoveOptions } from "#balance/moves/egg-moves";
import { SpeciesId } from "#enums/species-id";
import { describe, expect, it } from "vitest";

describe("Egg Moves Definitions", () => {
  it("has egg moves defined for all possible starters", () => {
    for (const speciesId of speciesDataRegistry.getAllStarters()) {
      if (speciesId === SpeciesId.PIKACHU) {
        continue;
      }
      expect(teamMemberMoveOptions).toHaveProperty(String(speciesId));
      expect(teamMemberMoveOptions[speciesId]).toHaveLength(4);
    }
  });
});

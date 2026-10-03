import "#app/extensions"; // Setup Phaser extension methods/etc

import { initAbilities } from "#abilities/init-abilities";
import { initGlobalAudioManager } from "#app/global-audio-manager";
import { initSettingsManager } from "#app/global-settings-manager";
import { initTeamMemberDataRegistry } from "#data/character-registry";
import { initTrainerTypeDialogue } from "#data/dialogue";
import { initSpeciesDataRegistry } from "#data/species-data-registry";
import { initTeamDataRegistry } from "#data/team-registry";
import { initBiomeBgmLoopPoints } from "#init/init-biome-bgm-loop-points";
import { initBiomeDepths } from "#init/init-biome-depths";
import { initBiomes } from "#init/init-biomes";
import { initStarterColors } from "#init/init-starter-colors";
import { initModifierPools } from "#modifiers/init-modifier-pools";
import { initModifierTypes } from "#modifiers/modifier-type";
import { initMoves } from "#moves/move";
import { initMysteryEncounters } from "#mystery-encounters/mystery-encounter-biomes";
import { initAchievements } from "#system/achv";

export async function initializeGame(): Promise<void> {
  await initStarterColors();
  initBiomeBgmLoopPoints();
  await initSettingsManager();
  initSpeciesDataRegistry();
  initTeamDataRegistry();
  initTeamMemberDataRegistry();
  await initGlobalAudioManager();
  initModifierTypes();
  initModifierPools();
  initAchievements();
  initBiomes();
  initBiomeDepths();
  initTrainerTypeDialogue();
  initMoves();
  initAbilities();
  initMysteryEncounters();
}

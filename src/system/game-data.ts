import { pokerogueApi } from "#api/api";
import { clientSessionId, getSessionDataLocalStorageKey, loggedInUser, updateUserInfo } from "#app/account";
import { defaultTeams, saveKey } from "#app/constants";
import { characterRegistry } from "#app/global-character-data-registry";
import { globalScene } from "#app/global-scene";
import { settings } from "#app/global-settings-manager";
import { teamRegistry } from "#app/global-team-data-registry";
import { activeOverrides } from "#app/overrides";
import { isIos } from "#app/touch-controls";
import { Tutorial } from "#app/tutorial";
import { bypassLogin, isBeta, isDev, systemSaveShortKeyMap } from "#constants/app-constants";
import { EntryHazardTag } from "#data/arena-tag";
import { Gender } from "#data/gender";
import { loadPositionalTag } from "#data/positional-tags/load-positional-tag";
import { BattleType } from "#enums/battle-type";
import type { CharacterId } from "#enums/character-id";
import type { Device } from "#enums/devices";
import { DexAttr } from "#enums/dex-attr";
import { GameDataType } from "#enums/game-data-type";
import type { Nature } from "#enums/nature";
import { PlayerGender } from "#enums/player-gender";
import { StatusEffect } from "#enums/status-effect";
import { TrainerVariant } from "#enums/trainer-variant";
import { UiMode } from "#enums/ui-mode";
import { Unlockables } from "#enums/unlockables";
import { ArenaTagAddedEvent, TerrainChangedEvent, WeatherChangedEvent } from "#events/arena";
import type { EnemyPokemon, PlayerPokemon } from "#field/pokemon";
// biome-ignore lint/performance/noNamespaceImport: Something weird is going on here and I don't want to touch it
import * as Modifier from "#modifiers/modifier";
import { MysteryEncounterSaveData } from "#mystery-encounters/mystery-encounter-save-data";
import { version } from "#package.json";
import type { Variant } from "#sprites/variant";
import { achvs } from "#system/achv";
import { ArenaData, type SerializedArenaData } from "#system/arena-data";
import { GameStats } from "#system/game-stats";
import { ModifierData as PersistentModifierData } from "#system/modifier-data";
import { PokemonData } from "#system/pokemon-data";
import { TrainerData } from "#system/trainer-data";
import { applySessionVersionMigration, applySystemVersionMigration } from "#system/version-converter";
import type {
  AchvUnlocks,
  AppliedMigrators,
  IconProps,
  RunHistoryData,
  SeenDialogues,
  SessionSaveData,
  SystemSaveData,
  TeamSaveData,
  TutorialFlags,
  Unlocks,
} from "#types/save-data";
import type { ConfirmModeConfig } from "#types/ui-types";
import { RUN_HISTORY_LIMIT } from "#ui/run-history-ui-handler";
import { fixedInt, randInt } from "#utils/common";
import { decrypt, encrypt, getDataTypeKey, isValidJSON } from "#utils/data";
import { compareVersions } from "#utils/migrator-utils";
import { toCamelCase } from "#utils/strings";
import { AES, enc } from "crypto-js";
import i18next from "i18next";

const ErrorMessages = {
  OUT_OF_DATE: i18next.t("gameData:reloadSaveData"),
  OUT_OF_DATE_LOCAL: i18next.t("gameData:reloadSaveDataLocal"),
  DATA_NOT_FOUND: i18next.t("gameData:saveDataNotFound"),
  TOO_MANY_CONNECTIONS: i18next.t("gameData:tooManyConnections"),
  FAILED_VALIDATION: i18next.t("gameData:failedSaveValidation"),
  GAME_OUT_OF_DATE: i18next.t("gameData:gameOutOfDate"),
} as const;

export class GameData {
  public trainerId: number;
  public secretId: number;
  public teamSaveData: TeamSaveData;

  public gameStats: GameStats;
  public runHistory: RunHistoryData;

  public unlocks: Unlocks;

  public achvUnlocks: AchvUnlocks;
  public unlockPity: number[];

  public appliedMigrators: AppliedMigrators = {};

  /**
   * @param fromRaw - (Default `false`) Whether to skip initialization of fields that are normally
   * randomized on new game start. Used for the admin panel.
   */
  constructor(fromRaw = false) {
    if (fromRaw) {
      this.trainerId = 0;
      this.secretId = 0;
    } else {
      this.loadMappingConfigs();
      this.trainerId = randInt(65536);
      this.secretId = randInt(65536);
    }
    this.gameStats = new GameStats();
    this.runHistory = {};
    this.unlocks = {
      [Unlockables.ENDLESS_MODE]: false,
      [Unlockables.MINI_BLACK_HOLE]: false,
      [Unlockables.SPLICED_ENDLESS_MODE]: false,
      [Unlockables.EVIOLITE]: false,
    };
    this.achvUnlocks = {};
    this.unlockPity = [0, 0, 0, 0];
    this.initTeamMemberData();
  }

  public getSystemSaveData(): SystemSaveData {
    return {
      trainerId: this.trainerId,
      secretId: this.secretId,
      // TODO: save some settings (such as player gender) separately, outside of system data
      gender: settings.general.playerGender,
      teamSaveData: this.teamSaveData,
      gameStats: this.gameStats,
      unlocks: this.unlocks,
      achvUnlocks: this.achvUnlocks,
      gameVersion: globalScene.game.config.gameVersion,
      timestamp: Date.now(),
      unlockPity: this.unlockPity.slice(0),
      appliedMigrators: this.appliedMigrators,
    };
  }

  /**
   * Checks if an `Unlockable` has been unlocked.
   * @param unlockable The Unlockable to check
   * @returns `true` if the player has unlocked this `Unlockable` or an override has enabled it
   */
  public isUnlocked(unlockable: Unlockables): boolean {
    if (activeOverrides.ITEM_UNLOCK_OVERRIDE.includes(unlockable)) {
      return true;
    }
    return this.unlocks[unlockable];
  }

  private async showInvalidSaveModal<const T>(
    returnValue: T,
    message: string = ErrorMessages.FAILED_VALIDATION,
  ): Promise<T> {
    const { promise, resolve } = Promise.withResolvers<T>();

    await globalScene.ui.setMode(UiMode.ALERT_MODAL, message);

    // TODO: This is a temporary hacky solution to ensure the modal displays when saving
    // on the starter select UI, which change the UI mode without awaiting this async call..
    globalScene.time.delayedCall(fixedInt(1000), () => {
      // on the pokedex page, which changes the UiMode after calling this so the
      // user never sees the alert modal.
      if (globalScene.ui.mode === UiMode.ALERT_MODAL) {
        globalScene.time.delayedCall(fixedInt(4000), () => resolve(returnValue));
      } else {
        globalScene.ui.setMode(UiMode.ALERT_MODAL, message);
        globalScene.time.delayedCall(fixedInt(4000), () => resolve(returnValue));
      }
    });

    return promise;
  }

  public async saveSystem(): Promise<boolean> {
    const data = this.getSystemSaveData();
    globalScene.ui.savingIcon.show();

    const maxIntAttrValue = 0x80000000;
    const systemData = JSON.stringify(data, (_k: any, v: any) =>
      typeof v === "bigint" ? (v <= maxIntAttrValue ? Number(v) : v.toString()) : v,
    );

    localStorage.setItem(`data_${loggedInUser?.username}`, encrypt(systemData, bypassLogin));

    if (bypassLogin) {
      globalScene.ui.savingIcon.hide();
      return true;
    }

    const error = await pokerogueApi.savedata.system.update({ clientSessionId }, systemData);
    globalScene.ui.savingIcon.hide();
    if (error) {
      if (error.startsWith("session out of date")) {
        globalScene.phaseManager.clearPhaseQueue();
        await this.reinitializeSaveData();
      }
      console.error(error);
      return false;
    }
    return true;
  }

  public async loadSystem(): Promise<boolean> {
    console.log("Client Session:", clientSessionId);

    if (bypassLogin && !localStorage.getItem(`data_${loggedInUser?.username}`)) {
      return false;
    }

    if (bypassLogin) {
      return await this.initSystem(decrypt(localStorage.getItem(`data_${loggedInUser?.username}`)!, bypassLogin)); // TODO: is this bang correct?
    }
    const saveDataOrErr = await pokerogueApi.savedata.system.get({ clientSessionId });

    if (typeof saveDataOrErr === "number" || !saveDataOrErr || saveDataOrErr.length === 0 || saveDataOrErr[0] !== "{") {
      if (saveDataOrErr === 404) {
        globalScene.phaseManager.queueMessage(ErrorMessages.DATA_NOT_FOUND, null, true);
        return true;
      }
      if (typeof saveDataOrErr === "string" && saveDataOrErr.includes("Too many connections")) {
        globalScene.phaseManager.queueMessage(ErrorMessages.TOO_MANY_CONNECTIONS, null, true);
        return false;
      }
      return false;
    }

    const cachedSystem = localStorage.getItem(`data_${loggedInUser?.username}`);
    return await this.initSystem(
      saveDataOrErr,
      cachedSystem ? AES.decrypt(cachedSystem, saveKey).toString(enc.Utf8) : undefined,
    );
  }

  /**
   * Used by the admin panel when searching for user accounts.
   * @param dataStr - The raw JSON string of the `SystemSaveData`
   * @returns - A new `GameData` instance initialized with the parsed `SystemSaveData`
   */
  public static fromRawSystem(dataStr: string): GameData {
    const gameData = new GameData(true);
    const systemData = GameData.parseSystemData(dataStr);
    gameData.initParsedSystem(systemData);
    return gameData;
  }

  /**
   * Initialize system data _after_ it has been parsed from JSON.
   * @param systemData - The parsed `SystemSaveData` to initialize from
   */
  private initParsedSystem(systemData: SystemSaveData): void {
    applySystemVersionMigration(systemData);

    this.appliedMigrators = systemData.appliedMigrators;
    this.trainerId = systemData.trainerId;
    this.secretId = systemData.secretId;

    if (systemData.gameStats) {
      this.gameStats = systemData.gameStats;
    }

    if (systemData.unlocks) {
      for (const key of Object.keys(systemData.unlocks)) {
        if (Object.hasOwn(this.unlocks, key)) {
          this.unlocks[key] = systemData.unlocks[key];
        }
      }
    }

    if (systemData.achvUnlocks) {
      for (const a of Object.keys(systemData.achvUnlocks)) {
        if (Object.hasOwn(achvs, a)) {
          this.achvUnlocks[a] = systemData.achvUnlocks[a];
        }
      }
    }

    // Ensure that the player gender in settings matches the player gender in system data
    if (systemData.gender !== PlayerGender.UNSET && systemData.gender !== settings.general.playerGender) {
      settings.update("general", "playerGender", systemData.gender);
    }
  }

  private async initSystem(systemDataStr: string, cachedSystemDataStr?: string): Promise<boolean> {
    // TODO: is it really a good idea to try to continue on if the system save data is corrupt?
    try {
      let systemData = GameData.parseSystemData(systemDataStr);

      if (cachedSystemDataStr) {
        const cachedSystemData = GameData.parseSystemData(cachedSystemDataStr);
        if (cachedSystemData.timestamp > systemData.timestamp) {
          console.debug("Using cached system data");
          systemData = cachedSystemData;
          systemDataStr = cachedSystemDataStr;
        } else {
          this.clearLocalData();
        }
      }

      if (isBeta || isDev) {
        try {
          // Shallowly clone system data during logging to avoid memory leaks
          console.debug(
            GameData.parseSystemData(
              JSON.stringify(systemData, (_, v: any) => (typeof v === "bigint" ? v.toString() : v)),
            ),
          );
        } catch (err) {
          console.debug("Attempt to log system data failed:", err);
        }
      }

      localStorage.setItem(`data_${loggedInUser?.username}`, encrypt(systemDataStr, bypassLogin));

      const lsItemKey = `runHistoryData_${loggedInUser?.username}`;
      const lsItem = localStorage.getItem(lsItemKey);
      if (!lsItem) {
        localStorage.setItem(lsItemKey, "");
      }

      if (!isDev && !isBeta && compareVersions(systemData.gameVersion, version) === 1) {
        await globalScene.ui.setMode(UiMode.ALERT_MODAL, ErrorMessages.GAME_OUT_OF_DATE);

        globalScene.time.delayedCall(fixedInt(1000), () => {
          if (globalScene.ui.mode !== UiMode.ALERT_MODAL) {
            globalScene.ui.setMode(UiMode.ALERT_MODAL, ErrorMessages.GAME_OUT_OF_DATE);
          }
        });
        return false;
      }
      this.initParsedSystem(systemData);
      return true;
    } catch (err) {
      console.error(err);
      return false;
    }
  }

  /**
   * Retrieves current run history data, organized by time stamp.
   * At the moment, only retrievable from locale cache
   */
  // TODO: save run history data to server?
  async getRunHistoryData(): Promise<RunHistoryData> {
    const lsItemKey = `runHistoryData_${loggedInUser?.username}`;
    const lsItem = localStorage.getItem(lsItemKey);
    if (lsItem) {
      const cachedResponse = lsItem;
      if (cachedResponse) {
        const runHistory: RunHistoryData = JSON.parse(decrypt(cachedResponse, bypassLogin));
        return runHistory;
      }
      return {};
    }
    localStorage.setItem(`runHistoryData_${loggedInUser?.username}`, "");
    return {};
  }

  /**
   * Saves a new entry to Run History
   * @param runEntry: most recent SessionSaveData of the run
   * @param isVictory: result of the run
   * Arbitrary limit of 25 runs per player - Will delete runs, starting with the oldest one, if needed
   */
  // TODO: save run history data to server?
  async saveRunHistory(runEntry: SessionSaveData, isVictory: boolean): Promise<boolean> {
    const runHistoryData = await this.getRunHistoryData();
    // runHistoryData should always return run history or {} empty object
    let timestamps = Object.keys(runHistoryData).map(Number);

    // Arbitrary limit of 25 entries per user --> Can increase or decrease
    while (timestamps.length >= RUN_HISTORY_LIMIT) {
      const oldestTimestamp = Math.min.apply(Math, timestamps).toString();
      delete runHistoryData[oldestTimestamp];
      timestamps = Object.keys(runHistoryData).map(Number);
    }

    const timestamp = runEntry.timestamp.toString();
    runHistoryData[timestamp] = {
      entry: runEntry,
      isVictory,
      isFavorite: false,
    };
    localStorage.setItem(
      `runHistoryData_${loggedInUser?.username}`,
      encrypt(JSON.stringify(runHistoryData), bypassLogin),
    );
    return true;
  }

  // TODO: Why is this static
  static parseSystemData(dataStr: string): SystemSaveData {
    const parsedData = JSON.parse(dataStr, (k: string, v: any) => {
      if (k === "gameStats") {
        return new GameStats(v);
      }

      return k.endsWith("Attr") && !["natureAttr", "abilityAttr", "passiveAttr"].includes(k) ? BigInt(v ?? 0) : v;
    }) as SystemSaveData;
    parsedData.appliedMigrators ??= {};
    return parsedData;
  }

  private convertSystemDataStr(dataStr: string, shorten = false): string {
    if (!shorten) {
      // Account for past key oversight
      dataStr = dataStr.replace(/\$pAttr/g, "$pa");
    }
    dataStr = dataStr.replace(/"trainerId":\d+/g, `"trainerId":${this.trainerId}`);
    dataStr = dataStr.replace(/"secretId":\d+/g, `"secretId":${this.secretId}`);
    const fromKeys = shorten ? Object.keys(systemSaveShortKeyMap) : Object.values(systemSaveShortKeyMap);
    const toKeys = shorten ? Object.values(systemSaveShortKeyMap) : Object.keys(systemSaveShortKeyMap);
    for (const k in fromKeys) {
      dataStr = dataStr.replace(new RegExp(`${fromKeys[k].replace("$", "\\$")}`, "g"), toKeys[k]);
    }

    return dataStr;
  }

  public async verify(): Promise<boolean> {
    if (bypassLogin) {
      return true;
    }

    const systemData = await pokerogueApi.savedata.system.verify({ clientSessionId });

    if (systemData == null) {
      return true;
    }

    globalScene.phaseManager.clearPhaseQueue();
    await this.reinitializeSaveData({ systemDataStr: JSON.stringify(systemData) });
    return false;
  }

  public clearLocalData(): void {
    if (bypassLogin) {
      return;
    }
    localStorage.removeItem(`data_${loggedInUser?.username}`);
    for (let s = 0; s < 5; s++) {
      localStorage.removeItem(getSessionDataLocalStorageKey(s));
    }
  }

  /**
   * Discards local save data and re-populates it with data from the server (or the provided data).
   * @param systemDataStr - (Optional) Save data to load
   * @param message - (Optional) The message to display to the user
   */
  private async reinitializeSaveData({
    systemDataStr,
    message,
  }: {
    systemDataStr?: string;
    message?: string;
  } = {}): Promise<false> {
    const alertMessage = systemDataStr ? ErrorMessages.OUT_OF_DATE_LOCAL : ErrorMessages.OUT_OF_DATE;

    this.clearLocalData();

    if (systemDataStr) {
      await this.initSystem(systemDataStr);
    } else {
      await this.loadSystem();
    }

    return this.showInvalidSaveModal(false, message ?? alertMessage);
  }

  /**
   * Saves the mapping configurations for a specified device.
   *
   * @param deviceName - The name of the device for which the configurations are being saved.
   * @param config - The configuration object containing custom mapping details.
   */
  public saveMappingConfigs(deviceName: string, config): void {
    const key = deviceName.toLowerCase();
    let mappingConfigs: object = {};
    const lsMappingConfigs = localStorage.getItem(getDataTypeKey(GameDataType.MAPPING_CONFIG));

    if (lsMappingConfigs) {
      try {
        mappingConfigs = JSON.parse(lsMappingConfigs);
      } catch (err) {
        console.error("Error parsing mapping configs from local storage:", err);
      }
    }

    if (!mappingConfigs[key]) {
      mappingConfigs[key] = {};
    }
    mappingConfigs[key].custom = config.custom;

    localStorage.setItem(getDataTypeKey(GameDataType.MAPPING_CONFIG), JSON.stringify(mappingConfigs));
  }

  /**
   * Loads the mapping configurations from localStorage and injects them into the input controller.
   *
   * @returns `true` if the configurations are successfully loaded and injected;
   * `false` if no configurations are found in localStorage.
   */
  public loadMappingConfigs(): boolean {
    const lsMappingConfigs = localStorage.getItem(getDataTypeKey(GameDataType.MAPPING_CONFIG));
    if (!lsMappingConfigs) {
      return false;
    }

    const mappingConfigs = JSON.parse(lsMappingConfigs);

    for (const key of Object.keys(mappingConfigs)) {
      globalScene.inputController.injectConfig(key, mappingConfigs[key]);
    }

    return true;
  }

  /**
   * Reset the mappings for the given device to its default values. \
   * If it's a gamepad, only reset the one currently in use.
   * @param device - The {@linkcode Device} to reset
   * @returns Whether the operation was successful
   */
  public resetMappingToDefault(device: Device): boolean {
    const deviceName = globalScene.inputController?.selectedDevice[device];
    if (!deviceName) {
      return false;
    }

    const lsMappingConfigs = localStorage.getItem(getDataTypeKey(GameDataType.MAPPING_CONFIG));
    if (!lsMappingConfigs) {
      return false;
    }

    let mappingConfigs = {};

    try {
      mappingConfigs = JSON.parse(lsMappingConfigs);
    } catch (err) {
      console.error("Error parsing mapping configs from local storage:", err);
      return false;
    }

    if (Object.hasOwn(mappingConfigs, deviceName)) {
      delete mappingConfigs[deviceName];
      localStorage.setItem(getDataTypeKey(GameDataType.MAPPING_CONFIG), JSON.stringify(mappingConfigs));
      globalScene.inputController.resetConfig(device);
    }

    return true;
  }

  /**
   * Save the specified tutorial as having the specified completion status.
   * @param tutorial - The {@linkcode Tutorial} whose completion status is being saved
   * @param status - The completion status to set
   */
  public saveTutorialFlag(tutorial: Tutorial, status: boolean): void {
    const saveDataKey = getDataTypeKey(GameDataType.TUTORIALS);
    const tutorials: TutorialFlags = Object.hasOwn(localStorage, saveDataKey)
      ? JSON.parse(localStorage.getItem(saveDataKey)!)
      : {};

    // TODO: We shouldn't be storing this like that
    for (const key of Object.values(Tutorial)) {
      if (key === tutorial) {
        tutorials[key] = status;
      } else {
        tutorials[key] ??= false;
      }
    }

    localStorage.setItem(saveDataKey, JSON.stringify(tutorials));
  }

  public getTutorialFlags(): TutorialFlags {
    const key = getDataTypeKey(GameDataType.TUTORIALS);
    const ret: TutorialFlags = Object.values(Tutorial).reduce((acc, tutorial) => {
      acc[Tutorial[tutorial]] = false;
      return acc;
    }, {} as TutorialFlags);

    if (!Object.hasOwn(localStorage, key)) {
      return ret;
    }

    const tutorials = JSON.parse(localStorage.getItem(key)!); // TODO: is this bang correct?

    for (const tutorial of Object.keys(tutorials)) {
      ret[tutorial] = tutorials[tutorial];
    }

    return ret;
  }

  public saveSeenDialogue(dialogue: string): boolean {
    const key = getDataTypeKey(GameDataType.SEEN_DIALOGUES);
    const dialogues: object = this.getSeenDialogues();

    dialogues[dialogue] = true;
    localStorage.setItem(key, JSON.stringify(dialogues));
    console.log("Dialogue saved as seen:", dialogue);

    return true;
  }

  public getSeenDialogues(): SeenDialogues {
    const key = getDataTypeKey(GameDataType.SEEN_DIALOGUES);
    const ret: SeenDialogues = {};

    if (!Object.hasOwn(localStorage, key)) {
      return ret;
    }

    const dialogues = JSON.parse(localStorage.getItem(key)!); // TODO: is this bang correct?

    for (const dialogue of Object.keys(dialogues)) {
      ret[dialogue] = dialogues[dialogue];
    }

    return ret;
  }

  public getSessionSaveData(): SessionSaveData {
    return {
      seed: globalScene.seed,
      playTime: globalScene.sessionPlayTime,
      gameMode: globalScene.gameMode.modeId,
      party: globalScene.getPlayerParty().map(p => new PokemonData(p)),
      enemyParty: globalScene.getEnemyParty().map(p => new PokemonData(p)),
      modifiers: globalScene.findModifiers(() => true).map(m => new PersistentModifierData(m, true)),
      enemyModifiers: globalScene.findModifiers(() => true, false).map(m => new PersistentModifierData(m, false)),
      arena: new ArenaData(globalScene.arena),
      money: Math.floor(globalScene.money),
      score: globalScene.score,
      waveIndex: globalScene.currentBattle.waveIndex,
      battleType: globalScene.currentBattle.battleType,
      trainer:
        globalScene.currentBattle.battleType === BattleType.TRAINER
          ? new TrainerData(globalScene.currentBattle.trainer)
          : null,
      gameVersion: globalScene.game.config.gameVersion,
      timestamp: Date.now(),
      mysteryEncounterType: globalScene.currentBattle.mysteryEncounter?.encounterType ?? -1,
      mysteryEncounterSaveData: globalScene.mysteryEncounterSaveData,
      playerFaints: globalScene.arena.playerFaints,
    } as SessionSaveData;
  }

  public async getSession(slotId: number): Promise<SessionSaveData | undefined> {
    // TODO: Do we need this fallback anymore?
    if (slotId < 0) {
      return;
    }

    console.debug("Getting Session Slot id: %d", slotId);

    const sessionData = localStorage.getItem(getSessionDataLocalStorageKey(slotId));
    if (sessionData) {
      return this.parseSessionData(decrypt(sessionData, bypassLogin));
    }
    if (bypassLogin) {
      return;
    }

    const response = await pokerogueApi.savedata.session.get({ slot: slotId, clientSessionId });
    if (response == null || response.trim() === "save does not exist") {
      return;
    }
    if (!isValidJSON(response)) {
      console.error("Invalid save data detected!", response);
      return;
    }

    localStorage.setItem(getSessionDataLocalStorageKey(slotId), encrypt(response, bypassLogin));

    return this.parseSessionData(response);
  }

  async renameSession(slotId: number, newName: string): Promise<boolean> {
    if (slotId < 0) {
      return false;
    }
    // TODO: Why do we consider renaming to an empty string successful if it does nothing?
    if (newName === "") {
      return true;
    }
    const sessionData = await this.getSession(slotId);
    if (!sessionData) {
      return false;
    }

    sessionData.name = newName;
    // update timestamp by 1 to ensure the session is saved
    sessionData.timestamp += 1;
    const updatedDataStr = JSON.stringify(sessionData);
    const encrypted = encrypt(updatedDataStr, bypassLogin);
    const secretId = this.secretId;
    const trainerId = this.trainerId;

    if (bypassLogin) {
      localStorage.setItem(getSessionDataLocalStorageKey(slotId), encrypt(updatedDataStr, bypassLogin));
      return true;
    }

    const response = await pokerogueApi.savedata.session.update(
      { slot: slotId, trainerId, secretId, clientSessionId },
      updatedDataStr,
    );

    if (response) {
      return false;
    }
    localStorage.setItem(getSessionDataLocalStorageKey(slotId), encrypted);
    const [success] = await updateUserInfo();
    return success;
  }

  /**
   * Load stored session data and re-initialize the game with its contents.
   * @param slotIndex - The 0-indexed position of the save slot to load.
   *   Values `< 0` are considered invalid.
   * @returns A Promise that resolves with whether the session load succeeded
   * (i.e. whether a save in the given slot exists)
   */
  public async loadSession(slotIndex: number): Promise<boolean> {
    const sessionData = await this.getSession(slotIndex);
    if (!sessionData) {
      return false;
    }
    await this.initSessionFromData(sessionData);
    return true;
  }

  // TODO: This needs a giant refactor and overhaul
  private async initSessionFromData(fromSession: SessionSaveData): Promise<void> {
    if (isBeta || isDev) {
      try {
        console.debug(
          this.parseSessionData(JSON.stringify(fromSession, (_, v: any) => (typeof v === "bigint" ? v.toString() : v))),
        );
      } catch (err) {
        console.debug("Attempt to log session data failed: ", err);
      }
    }

    globalScene.setSeed(fromSession.seed || globalScene.game.config.seed[0]);
    globalScene.resetSeed();

    console.log("Seed:", globalScene.seed);

    globalScene.sessionPlayTime = fromSession.playTime || 0;
    globalScene.lastSavePlayTime = 0;

    const loadPokemonAssets: Promise<void>[] = [];

    const party = globalScene.getPlayerParty();
    party.splice(0, party.length);

    for (const p of fromSession.party) {
      const pokemon = p.toPokemon() as PlayerPokemon;
      pokemon.setVisible(false);
      loadPokemonAssets.push(pokemon.loadAssets(false));
      party.push(pokemon);
    }

    globalScene.money = Math.floor(fromSession.money || 0);
    globalScene.updateMoneyText();

    if (globalScene.money > this.gameStats.highestMoney) {
      this.gameStats.highestMoney = globalScene.money;
    }

    globalScene.score = fromSession.score;
    globalScene.updateScoreText();

    globalScene.mysteryEncounterSaveData = new MysteryEncounterSaveData(fromSession.mysteryEncounterSaveData);
    await globalScene.loadBiomeAssets(fromSession.arena.biome);
    globalScene.newArena(fromSession.arena.biome, fromSession.playerFaints);

    const battle = globalScene.newBattle(fromSession);
    const { battleType } = battle;
    battle.enemyLevels = fromSession.enemyParty.map(p => p.level);

    globalScene.arena.init();

    fromSession.enemyParty.forEach((enemyData, e) => {
      const enemyPokemon = enemyData.toPokemon(
        battleType,
        e,
        fromSession.trainer?.variant === TrainerVariant.DOUBLE,
      ) as EnemyPokemon;
      battle.enemyParty[e] = enemyPokemon;
      if (battleType === BattleType.WILD) {
        battle.seenEnemyPartyMemberIds.add(enemyPokemon.id);
      }

      loadPokemonAssets.push(enemyPokemon.loadAssets());
    });

    // #region Arena stuff
    const { weather, terrain, playerTerasUsed, tags, positionalTags } = fromSession.arena;

    if (weather) {
      globalScene.arena.weather = weather;
      globalScene.arena.eventTarget.dispatchEvent(
        new WeatherChangedEvent(weather.weatherType, weather.turnsLeft, weather.maxDuration),
      );
    }

    if (terrain) {
      globalScene.arena.terrain = terrain;
      globalScene.arena.eventTarget.dispatchEvent(
        new TerrainChangedEvent(terrain.terrainType, terrain.turnsLeft, terrain.maxDuration),
      );
    }

    globalScene.arena.playerTerasUsed = playerTerasUsed;

    globalScene.arena.tags = tags;
    for (const tag of tags) {
      const { tagType, side, turnCount, maxDuration } = tag;
      const layers: [number, number] | undefined =
        tag instanceof EntryHazardTag ? [tag.layers, tag.maxLayers] : undefined;
      globalScene.arena.eventTarget.dispatchEvent(
        new ArenaTagAddedEvent(tagType, side, turnCount, layers, maxDuration),
      );
    }

    globalScene.arena.positionalTagManager.tags = positionalTags.map(tag => loadPositionalTag(tag));

    // #endregion Arena stuff

    if (globalScene.modifiers.length > 0) {
      console.warn("Existing modifiers not cleared on session load, deleting...");
      globalScene.modifiers = [];
    }
    for (const modifierData of fromSession.modifiers) {
      const modifier = modifierData.toModifier(Modifier[modifierData.className]);
      if (modifier) {
        globalScene.addModifier(modifier, true);
      }
    }
    globalScene.updateModifiers(true);

    for (const enemyModifierData of fromSession.enemyModifiers) {
      const modifier = enemyModifierData.toModifier(Modifier[enemyModifierData.className]);
      if (modifier) {
        globalScene.addEnemyModifier(modifier, true);
      }
    }

    globalScene.updateModifiers(false);

    await Promise.all(loadPokemonAssets);
  }

  /**
   * Delete the session data at the given slot when overwriting a save file
   * For deleting the session of a finished run, use {@linkcode tryClearSession}
   * @param slotId - The slot to clear
   * @returns A Promise that resolves with whether the session deletion succeeded
   */
  async deleteSession(slotId: number): Promise<boolean> {
    if (bypassLogin) {
      localStorage.removeItem(getSessionDataLocalStorageKey(slotId));
      return true;
    }

    const [success] = await updateUserInfo();
    if (!success) {
      return false;
    }

    const error = await pokerogueApi.savedata.session.delete({ slot: slotId, clientSessionId });
    if (!error) {
      if (loggedInUser) {
        loggedInUser.lastSessionSlot = -1;
      }

      localStorage.removeItem(getSessionDataLocalStorageKey(slotId));
      return true;
    }
    if (error.startsWith("session out of date")) {
      globalScene.phaseManager.clearPhaseQueue();
      await this.reinitializeSaveData();
    }
    console.error(error);
    return false;
  }

  /**
   * Clear a daily run on an offline game, adding it to a locally-stored cache of cleared seeds.
   */
  // TODO: Explain what this boolean return is supposed to signify inside game-over-phase.ts
  async offlineNewClear(): Promise<boolean> {
    const sessionData = this.getSessionSaveData();
    const { seed } = sessionData;

    const prevDailies = localStorage.getItem("daily");
    if (!prevDailies) {
      localStorage.setItem("daily", btoa(JSON.stringify([seed])));
      return true;
    }
    const clearedDailies = JSON.parse(atob(prevDailies)) as string[];
    if (clearedDailies.includes(seed)) {
      return false;
    }
    clearedDailies.push(seed);
    localStorage.setItem("daily", btoa(JSON.stringify(clearedDailies)));
    return true;
  }

  /**
   * Attempt to clear session data after the end of a run
   * After session data is removed, attempt to update user info so the menu updates
   * To delete an unfinished run instead, use {@linkcode deleteSession}
   */
  async tryClearSession(slotId: number): Promise<[success: boolean, newClear: boolean]> {
    const [success] = await updateUserInfo();
    if (!success) {
      return [false, false];
    }

    if (bypassLogin) {
      localStorage.removeItem(getSessionDataLocalStorageKey(slotId));
      return [true, true];
    }

    const sessionData = this.getSessionSaveData();
    const { trainerId } = this;
    const jsonResponse = await pokerogueApi.savedata.session.clear(
      { slot: slotId, trainerId, clientSessionId },
      sessionData,
    );

    if (!jsonResponse.error) {
      localStorage.removeItem(getSessionDataLocalStorageKey(slotId));
      return [true, !!jsonResponse.success];
    }

    if (jsonResponse.error.startsWith("session out of date")) {
      globalScene.phaseManager.clearPhaseQueue();
      await this.reinitializeSaveData();
    }

    console.error(jsonResponse);
    return [false, false];
  }

  parseSessionData(dataStr: string): SessionSaveData {
    // TODO: Add `null`/`undefined` to the corresponding type signatures for this
    // (or prevent them from being null)
    // If the value is able to *not exist*, it should say so in the code
    const rawData = JSON.parse(dataStr);
    applySessionVersionMigration(rawData);

    for (const [k, v] of Object.entries(rawData)) {
      switch (k) {
        case "party":
        case "enemyParty": {
          const ret: PokemonData[] = [];
          for (const pd of v ?? []) {
            // TODO: Consider invoking a dedicated deserialization method instead of the constructor
            ret.push(new PokemonData(pd));
          }
          rawData[k] = ret;
          continue;
        }

        case "trainer":
          rawData[k] = v ? new TrainerData(v) : null;
          continue;

        case "modifiers":
        case "enemyModifiers": {
          const ret: PersistentModifierData[] = [];
          for (const md of v ?? []) {
            if (md?.className === "ExpBalanceModifier") {
              // Temporarily limit EXP Balance until it gets reworked
              md.stackCount = Math.min(md.stackCount, 4);
            }

            if (
              md instanceof Modifier.EnemyAttackStatusEffectChanceModifier
              && (md.effect === StatusEffect.FREEZE || md.effect === StatusEffect.SLEEP)
            ) {
              // Discard any old "sleep/freeze chance tokens".
              // TODO: make this migrate script
              continue;
            }

            ret.push(new PersistentModifierData(md, k === "modifiers"));
          }
          rawData[k] = ret;
          continue;
        }

        case "arena":
          rawData[k] = new ArenaData(v as SerializedArenaData);
          continue;

        case "mysteryEncounterSaveData":
          rawData[k] = new MysteryEncounterSaveData(v);
          continue;
      }
    }

    return rawData;
  }

  /**
   * Save all data related to the current session to {@linkcode localStorage} and/or the backend server.
   * @param skipVerification - (Default `false`) Whether to skip verifying user info before saving
   * @param sync - (Default `false`) Whether to sync data to the server
   * @param useCachedSession - (Default `false`) Whether to use cached session data from `localStorage` instead of generating new session data
   * @param useCachedSystem - (Default `false`) Whether to use cached system data from `localStorage` instead of generating new system data
   * @returns A Promise that resolves with whether the save operation succeeded.
   */
  // TODO: The name of this method is extremely misleading and suggests that it saves everything across all slots
  // TODO: This should not be able to take `sync=false` alongside either 'use cached' option (in which case we would save the exact same data that was already there)
  async saveAll(
    skipVerification = false,
    sync = false,
    useCachedSession = false,
    useCachedSystem = false,
  ): Promise<boolean> {
    if (!skipVerification) {
      const [success] = await updateUserInfo();
      if (!success) {
        return false;
      }
    }

    const sessionData = useCachedSession
      ? this.parseSessionData(
          decrypt(localStorage.getItem(getSessionDataLocalStorageKey(globalScene.sessionSlotId))!, bypassLogin),
        ) // TODO: is this bang correct?
      : this.getSessionSaveData();

    const maxIntAttrValue = 0x80000000;

    const systemData = useCachedSystem
      ? GameData.parseSystemData(decrypt(localStorage.getItem(`data_${loggedInUser?.username}`)!, bypassLogin))
      : this.getSystemSaveData(); // TODO: is this bang correct?

    // Saving icon should go after validation to avoid confusing users.
    if (sync) {
      globalScene.ui.savingIcon.show();
    }

    const request = {
      system: systemData,
      session: sessionData,
      sessionSlotId: globalScene.sessionSlotId,
      clientSessionId,
    };

    localStorage.setItem(
      `data_${loggedInUser?.username}`,
      encrypt(
        JSON.stringify(systemData, (_k: any, v: any) =>
          typeof v === "bigint" ? (v <= maxIntAttrValue ? Number(v) : v.toString()) : v,
        ),
        bypassLogin,
      ),
    );

    localStorage.setItem(
      getSessionDataLocalStorageKey(globalScene.sessionSlotId),
      encrypt(JSON.stringify(sessionData), bypassLogin),
    );

    console.debug(`Session data saved to slot ${globalScene.sessionSlotId}!`);

    if (bypassLogin || !sync) {
      const verified = await this.verify();
      globalScene.ui.savingIcon.hide();
      return verified;
    }

    const saveError = await pokerogueApi.savedata.updateAll(request);
    if (sync) {
      globalScene.lastSavePlayTime = 0;
      globalScene.ui.savingIcon.hide();
    }

    if (!saveError) {
      return true;
    }

    // TODO: handle this more gracefully
    if (saveError.startsWith("session out of date")) {
      globalScene.phaseManager.clearPhaseQueue();
      await this.reinitializeSaveData();
    }
    console.error(saveError);
    return false;
  }

  public async tryExportData(dataType: GameDataType, slotId = 0): Promise<boolean> {
    const dataKey = `${getDataTypeKey(dataType, slotId)}_${loggedInUser?.username}`;
    let data: string | null;

    // TODO: This control flow still leaves something to be desired
    if (bypassLogin || (dataType !== GameDataType.SYSTEM && dataType !== GameDataType.SESSION)) {
      const encrypted = localStorage.getItem(dataKey);
      if (typeof encrypted !== "string") {
        return false;
      }

      data = decrypt(encrypted, bypassLogin);
      if (dataType === GameDataType.SYSTEM) {
        data = this.convertSystemDataStr(data, true);
      }
    } else if (dataType === GameDataType.SYSTEM) {
      const resp = await pokerogueApi.savedata.system.get({ clientSessionId });
      if (typeof resp !== "string") {
        return false;
      }
      data = this.convertSystemDataStr(resp, true);
    } else {
      dataType satisfies GameDataType.SESSION;
      const resp = await pokerogueApi.savedata.session.get({ slot: slotId, clientSessionId });
      if (typeof resp !== "string") {
        return false;
      }
      data = resp;
    }

    // TODO: this is a really shit way of checking JSON validity
    if (!data || data.charAt(0) !== "{") {
      console.error("Exported save data is invalid JSON!", data);
      return false;
    }

    const encryptedData = AES.encrypt(data, saveKey);
    const blob = new Blob([encryptedData.toString()], {
      type: "text/json",
    });
    const link = document.createElement("a");
    link.href = window.URL.createObjectURL(blob);
    link.download = `${dataKey}.prsv`;
    link.click();
    link.remove();

    return true;
  }

  // TODO: Refactor this spaghetti monster
  public importData(dataType: GameDataType, slotId = 0, confirmWindowXOffset?: number): void {
    const dataKey = `${getDataTypeKey(dataType, slotId)}_${loggedInUser?.username}`;

    document.getElementById("saveFile")?.remove();

    const saveFile = document.createElement("input");
    saveFile.id = "saveFile";
    saveFile.type = "file";
    saveFile.accept = isIos() ? ".prsv" : ".prsv, .json, .txt";

    // iOS requires user interaction with a visible element to trigger file input
    if (isIos()) {
      const uploadButton = document.createElement("button");
      uploadButton.id = "iosUploadButton";
      uploadButton.textContent = "Select File to Import";
      uploadButton.style.cssText = `
        position: fixed;
        top: 50%;
        left: 50%;
        transform: translate(-50%, -50%);
        padding: 15px 30px;
        font-size: 18px;
        font-family: Arial, sans-serif;
        background-color: #4CAF50;
        color: white;
        border: none;
        border-radius: 8px;
        cursor: pointer;
        z-index: 10000;
        box-shadow: 0 4px 6px rgba(0,0,0,0.3);
      `;

      const overlay = document.createElement("div");
      overlay.id = "iosUploadOverlay";
      overlay.style.cssText = `
        position: fixed;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        background-color: rgba(0,0,0,0.7);
        z-index: 9999;
      `;

      saveFile.style.display = "none";

      uploadButton.onclick = () => {
        saveFile.click();
      };

      overlay.onclick = () => {
        overlay.remove();
        uploadButton.remove();
        saveFile.remove();
      };

      document.body.appendChild(overlay);
      document.body.appendChild(uploadButton);
    } else {
      saveFile.style.display = "none";
    }

    saveFile.addEventListener("change", ev => {
      const overlay = document.getElementById("iosUploadOverlay");
      const button = document.getElementById("iosUploadButton");
      overlay?.remove();
      button?.remove();

      const reader = new FileReader();

      reader.onload = (_ => {
        return e => {
          let valid = false;
          const dataName = i18next.t(`gameData:${toCamelCase(GameDataType[dataType])}`);
          const saveData = e.target?.result?.toString() ?? "";

          let dataStr: string;
          if (isValidJSON(saveData)) {
            dataStr = saveData;
          } else {
            dataStr = AES.decrypt(saveData, saveKey).toString(enc.Utf8);
          }

          try {
            switch (dataType) {
              case GameDataType.SYSTEM: {
                dataStr = this.convertSystemDataStr(dataStr);
                dataStr = dataStr.replace(/"playTime":\d+/, `"playTime":${this.gameStats.playTime + 60}`);
                const systemData = GameData.parseSystemData(dataStr);
                valid = !!systemData.timestamp;
                break;
              }
              case GameDataType.SESSION: {
                const sessionData = this.parseSessionData(dataStr);
                valid = !!sessionData.party && !!sessionData.enemyParty && !!sessionData.timestamp;
                break;
              }
              case GameDataType.RUN_HISTORY: {
                const data = JSON.parse(dataStr);
                const keys = Object.keys(data);
                keys.forEach(key => {
                  const entryKeys = Object.keys(data[key]);
                  valid =
                    ["isFavorite", "isVictory", "entry"].every(v => entryKeys.includes(v)) && entryKeys.length === 3;
                });
                break;
              }
              case GameDataType.SETTINGS:
              case GameDataType.TUTORIALS:
                valid = true;
                break;
            }
          } catch (ex) {
            console.error(ex);
          }

          const displayError = (error: string) =>
            globalScene.ui.showText(error, null, () => globalScene.ui.showText("", 0), fixedInt(1500));

          if (!valid) {
            return displayError(i18next.t("menuUiHandler:importCorrupt", { dataName }));
          }

          // TODO: move this outside of game data
          const importDataConfirmOptions: ConfirmModeConfig = {
            yesHandler: () => {
              localStorage.setItem(dataKey, encrypt(dataStr, bypassLogin));

              if (!bypassLogin && dataType < GameDataType.SETTINGS) {
                updateUserInfo().then(success => {
                  if (!success[0]) {
                    return displayError(i18next.t("menuUiHandler:importNoServer", { dataName }));
                  }
                  const { trainerId, secretId } = this;
                  let updatePromise: Promise<string | null>;
                  if (dataType === GameDataType.SESSION) {
                    updatePromise = pokerogueApi.savedata.session.update(
                      { slot: slotId, trainerId, secretId, clientSessionId },
                      dataStr,
                    );
                  } else {
                    updatePromise = pokerogueApi.savedata.system.update(
                      { trainerId, secretId, clientSessionId },
                      dataStr,
                    );
                  }
                  updatePromise.then(error => {
                    if (error) {
                      console.error(error);
                      return displayError(i18next.t("menuUiHandler:importError", { dataName }));
                    }
                    window.location.reload();
                  });
                });
              } else {
                window.location.reload();
              }
            },
            noHandler: () => {
              globalScene.ui.revertMode();
              globalScene.ui.showText("", 0);
            },
            xOffset: confirmWindowXOffset,
          };
          globalScene.ui.showText(i18next.t("menuUiHandler:confirmImport", { dataName }), null, () => {
            globalScene.ui.setOverlayMode(UiMode.CONFIRM, importDataConfirmOptions);
          });
        };
      })((ev.target as any).files[0]);

      reader.readAsText((ev.target as any).files[0]);
    });

    if (!isIos()) {
      saveFile.click();
    }
  }

  private initTeamMemberData(): void {
    const teamSaveData: TeamSaveData = {};

    const teamMemberIds = characterRegistry.getAllCharacterIds();
    for (const teamMemberId of teamMemberIds) {
      const teamId = teamRegistry.getTeamIdOf(teamMemberId);
      teamSaveData[teamMemberId] = {
        isTeamUnlocked: (teamId && defaultTeams.includes(teamId)) || false,
        isAbilityUnlocked: false,
        isPassiveUnlocked: false,
        runCount: 0n,
        winCount: 0n,
      };
    }

    this.teamSaveData = teamSaveData;
  }

  public getDefaultIconProps(charId: CharacterId): IconProps {
    const teamMember = characterRegistry.getCharacter(charId);
    // Default is female only for species where malePercent is not null but 0
    const gender = teamMember.identity?.gender || Gender.GENDERLESS;
    const formIndex = teamMember.identity?.formIndex || 0;
    const identity = teamMember.identity;

    if (identity?.variants?.unshiny) {
      return { shiny: false, gender, variant: 0, formIndex };
    }
    if (identity?.variants?.standard) {
      return { shiny: true, gender, variant: 0, formIndex };
    }
    if (identity?.variants?.rare) {
      return { shiny: false, gender, variant: 1, formIndex };
    }
    if (identity?.variants?.epic) {
      return { shiny: false, gender, variant: 2, formIndex };
    }
    return { shiny: false, gender, variant: 0, formIndex };
  }

  /**
   * Converts Pokédex attributes from a `bigint` to a readable {@linkcode IconProps} interface.
   *
   * @param dexAttr - The Pokédex attribute to convert
   * @returns the attributes in {@linkcode IconProps} format
   */
  getDexAttrProps(dexAttr: bigint): IconProps {
    const shiny = !(dexAttr & DexAttr.NON_SHINY);
    const gender = Gender.GENDERLESS; // TODO: Uh-oh!
    let variant: Variant = 0;
    if (dexAttr & DexAttr.DEFAULT_VARIANT) {
      variant = 0;
    } else if (dexAttr & DexAttr.VARIANT_2) {
      variant = 1;
    } else if (dexAttr & DexAttr.VARIANT_3) {
      variant = 2;
    }
    const formIndex = this.getFormIndex(dexAttr);

    return {
      shiny,
      gender,
      variant,
      formIndex,
    };
  }

  getDexAttrLuck(dexAttr: bigint): number {
    return dexAttr & DexAttr.SHINY ? (dexAttr & DexAttr.VARIANT_3 ? 3 : dexAttr & DexAttr.VARIANT_2 ? 2 : 1) : 0;
  }

  getNaturesForAttr(natureAttr = 0): Nature[] {
    const ret: Nature[] = [];
    for (let n = 0; n < 25; n++) {
      if (natureAttr & (1 << (n + 1))) {
        ret.push(n);
      }
    }
    return ret;
  }

  getAllNatures(): Nature[] {
    const ret: Nature[] = [];
    for (let n = 0; n < 25; n++) {
      ret.push(n);
    }
    return ret;
  }

  getFormIndex(attr: bigint): number {
    if (!attr || attr < DexAttr.DEFAULT_FORM) {
      return 0;
    }
    let f = 0;
    while (!(attr & this.getFormAttr(f))) {
      f++;
    }
    return f;
  }

  getFormAttr(formIndex: number): bigint {
    return BigInt(1) << BigInt(7 + formIndex);
  }
}

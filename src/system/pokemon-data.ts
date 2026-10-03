import { globalScene } from "#app/global-scene";
import { speciesDataRegistry } from "#app/global-species-data-registry";
import type { Gender } from "#data/gender";
import { CustomPokemonData, PokemonBattleData, PokemonSummonData } from "#data/pokemon-data";
import { Status } from "#data/status-effect";
import { BattleType } from "#enums/battle-type";
import type { MoveId } from "#enums/move-id";
import { Nature } from "#enums/nature";
import { PokeballType } from "#enums/pokeball";
import type { PokemonType } from "#enums/pokemon-type";
import type { SpeciesId } from "#enums/species-id";
import { TrainerSlot } from "#enums/trainer-slot";
import { EnemyPokemon, Pokemon } from "#field/pokemon";
import { PokemonMove } from "#moves/pokemon-move";
import type { Variant } from "#sprites/variant";

export class PokemonData {
  public id: number;
  public player: boolean;
  public species: SpeciesId;
  public nickname: string;
  public formIndex: number;
  public abilityIndex: number;
  public passive: boolean;
  public shiny: boolean;
  public variant: Variant;
  public pokeball: PokeballType;
  public level: number;
  public exp: number;
  public levelExp: number;
  public gender: Gender;
  public hp: number;
  public stats: number[];
  public ivs: number[];
  public nature: Nature;
  public moveset: PokemonMove[];
  public status: Status | null;
  public metLevel: number;
  public luck: number;
  public pauseEvolutions: boolean;
  public pokerus: boolean;
  public usedTMs: MoveId[];
  public teraType: PokemonType;
  public isTerastallized: boolean;
  public stellarTypesBoosted: PokemonType[];
  public boss: boolean;
  public bossSegments: number;

  // Effects that need to be preserved between waves
  public summonData: PokemonSummonData;
  public battleData: PokemonBattleData;
  public summonDataSpeciesFormIndex: number;

  public customPokemonData: CustomPokemonData;
  public fusionCustomPokemonData: CustomPokemonData;

  /**
   * Construct a new {@linkcode PokemonData} instance out of a {@linkcode Pokemon}
   * or JSON representation thereof.
   * @param source The {@linkcode Pokemon} to convert into data (or a JSON object representing one)
   */
  // TODO: Remove any from type signature in favor of 2 separate method funcs
  // TODO: change the source to `unknown` or create a method explicitly for converting from raw JSON data
  constructor(source: Pokemon | any) {
    const sourcePokemon = source instanceof Pokemon ? source : undefined;

    this.id = source.id;
    this.player = sourcePokemon?.isPlayer() ?? source.player;
    this.species = sourcePokemon?.species.speciesId ?? source.species;
    this.nickname = source.nickname;
    this.formIndex = Math.max(
      Math.min(source.formIndex, speciesDataRegistry.getSpecies(this.species).forms.length - 1),
      0,
    );
    this.abilityIndex = source.abilityIndex;
    this.passive = source.passive;
    this.shiny = source.shiny;
    this.variant = source.variant;
    this.pokeball = source.pokeball ?? PokeballType.POKEBALL;
    this.level = source.level;
    this.exp = source.exp;
    this.levelExp = source.levelExp;
    this.gender = source.gender;
    this.hp = source.hp;
    this.stats = source.stats;
    this.ivs = source.ivs;

    // TODO: Can't we move some of this verification stuff to an upgrade script?
    this.nature = source.nature ?? Nature.HARDY;
    this.moveset = source.moveset?.map((m: any) => PokemonMove.loadMove(m)) ?? [];
    this.status = source.status
      ? new Status(
          source.status.effect,
          source.status.toxicTurnCount,
          source.status.sleepTurnsRemaining,
          source.status.freezeTurnsRemaining,
        )
      : null;
    this.luck = source.luck ?? (source.shiny ? source.variant + 1 : 0);
    this.pauseEvolutions = !!source.pauseEvolutions;
    this.pokerus = !!source.pokerus;
    this.usedTMs = source.usedTMs ?? [];
    this.teraType = source.teraType as PokemonType;
    this.isTerastallized = !!source.isTerastallized;
    this.stellarTypesBoosted = source.stellarTypesBoosted ?? [];

    this.boss = (source instanceof EnemyPokemon && !!source.bossSegments) || (!this.player && !!source.boss);
    this.bossSegments = source.bossSegments ?? 0;

    this.summonData = new PokemonSummonData(source.summonData);
    this.battleData = new PokemonBattleData(source.battleData);
    this.summonDataSpeciesFormIndex =
      sourcePokemon?.summonData.speciesForm?.formIndex ?? source.summonDataSpeciesFormIndex;

    this.customPokemonData = new CustomPokemonData(source.customPokemonData);
    this.fusionCustomPokemonData = new CustomPokemonData(source.fusionCustomPokemonData);
  }

  toPokemon(battleType?: BattleType, partyMemberIndex = 0, double = false): Pokemon {
    const species = speciesDataRegistry.getSpecies(this.species);
    const ret: Pokemon = this.player
      ? globalScene.addPlayerPokemon(
          species,
          this.level,
          this.abilityIndex,
          this.formIndex,
          this.gender,
          this.shiny,
          this.variant,
          this.nature,
          this,
        )
      : globalScene.addEnemyPokemon(
          species,
          this.level,
          battleType === BattleType.TRAINER
            ? !double || !(partyMemberIndex % 2)
              ? TrainerSlot.TRAINER
              : TrainerSlot.TRAINER_PARTNER
            : TrainerSlot.NONE,
          this.boss,
          false,
          this,
        );

    // when loading from saved session, recover summonData.speciesFrom and form index species object
    // used to stay transformed on reload session
    if (this.summonData.speciesForm) {
      ret.summonData.speciesForm = speciesDataRegistry.getPokemonSpeciesForm(
        this.summonData.speciesForm.speciesId,
        this.summonDataSpeciesFormIndex,
      );
    }
    return ret;
  }
}

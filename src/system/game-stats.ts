//  public (.*?): number;
//    this.$1 = source?.$1 || 0;

export class GameStats {
  public playTime: number;
  public battles: number;
  public classicSessionsPlayed: number;
  public sessionsWon: number;
  public ribbonsOwned: number;
  public highestLevel: number;
  public highestMoney: number;
  public highestDamage: number;
  public highestHeal: number;
  public pokemonSeen: number;
  public pokemonDefeated: number;
  public subLegendaryPokemonSeen: number;
  public legendaryPokemonSeen: number;
  public mythicalPokemonSeen: number;
  public shinyPokemonSeen: number;
  public trainersDefeated: number;

  constructor(source?: any) {
    this.playTime = source?.playTime || 0;
    this.battles = source?.battles || 0;
    this.classicSessionsPlayed = source?.classicSessionsPlayed || 0;
    this.sessionsWon = source?.sessionsWon || 0;
    this.ribbonsOwned = source?.ribbonsOwned || 0;
    this.highestLevel = source?.highestLevel || 0;
    this.highestMoney = source?.highestMoney || 0;
    this.highestDamage = source?.highestDamage || 0;
    this.highestHeal = source?.highestHeal || 0;
    this.pokemonSeen = source?.pokemonSeen || 0;
    this.pokemonDefeated = source?.pokemonDefeated || 0;
    // Currently handled by migration
    this.subLegendaryPokemonSeen = source?.subLegendaryPokemonSeen ?? 0;
    this.legendaryPokemonSeen = source?.legendaryPokemonSeen || 0;
    this.mythicalPokemonSeen = source?.mythicalPokemonSeen || 0;
    this.shinyPokemonSeen = source?.shinyPokemonSeen || 0;
    this.trainersDefeated = source?.trainersDefeated || 0;
  }
}

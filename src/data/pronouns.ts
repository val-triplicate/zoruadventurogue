import { Gender } from "#data/gender";

export class Pronouns {
  public static readonly HE_HIM = new Pronouns("he", "him", "his", "himself", Gender.MALE);
  public static readonly IT_ITS = new Pronouns("it", "its", "its", "itself", Gender.GENDERLESS);
  public static readonly SHE_HER = new Pronouns("she", "her", "hers", "herself", Gender.FEMALE);
  public static readonly THEY_THEM_S = new Pronouns("they", "them", "their", "themself", Gender.GENDERLESS);
  public static readonly THEY_THEM_P = new Pronouns("they", "them", "their", "themselves", Gender.GENDERLESS);

  static get values(): Pronouns[] {
    return [Pronouns.HE_HIM, Pronouns.IT_ITS, Pronouns.SHE_HER, Pronouns.THEY_THEM_S, Pronouns.THEY_THEM_P];
  }

  private constructor(
    public readonly subjective: string,
    public readonly objective: string,
    public readonly possessive: string,
    public readonly reflexive: string,
    public readonly defaultGender: Gender,
  ) {}

  public conjugate(template: string): string {
    const wip = template;
    wip.replaceAll("[sub]", this.subjective);
    wip.replaceAll("[Sub]", this.capitalize(this.subjective));
    wip.replaceAll("[SUB]", this.subjective.toUpperCase());
    wip.replaceAll("[obj]", this.objective);
    wip.replaceAll("[Obj]", this.capitalize(this.objective));
    wip.replaceAll("[OBJ]", this.objective.toUpperCase());
    wip.replaceAll("[pos]", this.possessive);
    wip.replaceAll("[Pos]", this.capitalize(this.possessive));
    wip.replaceAll("[POS]", this.possessive.toUpperCase());
    wip.replaceAll("[ref]", this.reflexive);
    wip.replaceAll("[Ref]", this.capitalize(this.reflexive));
    wip.replaceAll("[REF]", this.reflexive.toUpperCase());
    return wip;
  }

  private capitalize(input: string): string {
    return String(input).charAt(0).toUpperCase() + String(input).slice(1);
  }
}

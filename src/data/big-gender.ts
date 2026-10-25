import { Gender, getGenderColor, getGenderSymbol } from "#data/gender";
import { Pronouns } from "#data/pronouns";

export class BigGender {
  public static readonly MALE = new BigGender(Gender.MALE, Pronouns.HE_HIM, false);
  public static readonly FEMALE = new BigGender(Gender.FEMALE, Pronouns.SHE_HER, true);
  public static readonly AMAB = new BigGender(Gender.GENDERLESS, Pronouns.THEY_THEM_S, false);
  public static readonly AFAB = new BigGender(Gender.GENDERLESS, Pronouns.THEY_THEM_S, true);

  private functionalGender: Gender;
  private pronouns: Pronouns;
  private isFemale: boolean;

  public constructor(gender?: Gender, pronouns?: Pronouns, useFemale?: boolean) {
    this.pronouns = pronouns ?? Pronouns.THEY_THEM_S;
    this.functionalGender = gender ?? this.pronouns.defaultGender;
    this.isFemale = useFemale ?? this.pronouns === Pronouns.SHE_HER;
  }

  // Replace a string's pronoun codes with the correct pronoun.
  public conjugate(template: string): string {
    return this.pronouns.conjugate(template);
  }

  // Treat this gender as female, if the code needs a binary answer (i.e. sprites).
  public useFemale(): boolean {
    return this.isFemale;
  }

  public getColor(shadow?: boolean) {
    return getGenderColor(this.functionalGender, shadow);
  }

  public getSymbol() {
    return getGenderSymbol(this.functionalGender);
  }
}

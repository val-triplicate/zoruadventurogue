export enum Gender {
  GENDERLESS = -1,
  MALE,
  FEMALE,
  NONBINARY,
  INTERSEX,
}

export function getGenderSymbol(gender: Gender) {
  switch (gender) {
    case Gender.MALE:
      return "♂";
    case Gender.FEMALE:
      return "♀";
    case Gender.NONBINARY:
      return "⚨";
    case Gender.INTERSEX:
      return "☿";
  }
  return "";
}

export function getGenderColor(gender: Gender, shadow?: boolean) {
  switch (gender) {
    case Gender.MALE:
      return shadow ? "#006090" : "#40c8f8";
    case Gender.FEMALE:
      return shadow ? "#984038" : "#f89890";
    case Gender.NONBINARY:
      return shadow ? "#730090" : "#d340f8";
    case Gender.INTERSEX:
      return shadow ? "#8e9838" : "#e7f890";
  }
  return "#ffffff";
}

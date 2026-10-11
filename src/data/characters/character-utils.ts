import { characterRegistry } from "#app/global-character-data-registry";
import type { Character } from "#data/characters/character";
import type { CharacterId } from "#enums/character-id";

export type CharacterInput = CharacterId | Character;

export function unfold(input: CharacterInput): [CharacterId, Character] {
  return [getId(input), getCharacter(input)];
}

export function getId(input: CharacterInput) {
  return fromEither(
    input,
    id => id,
    char => char.id,
  );
}

export function getCharacter(input: CharacterInput) {
  return fromEither(
    input,
    id => characterRegistry.getCharacter(id),
    char => char,
  );
}

export function fromEitherUnsafely<T>(
  input: CharacterId | Character,
  ifId: (c: CharacterId) => T | undefined,
  ifObj: (c: Character) => T | undefined,
  ifNeither?: T,
): T {
  let output: T | undefined;
  if (typeof input === "number") {
    output = ifId(input);
  } else if (typeof input === "object") {
    output = ifObj(input);
  } else {
    output = ifNeither;
  }
  if (output) {
    return output;
  }
  throw new Error("Result of fromEitherUnsafely was undefined or null.");
}

export function fromEither<T>(
  input: CharacterId | Character,
  ifId: (c: CharacterId) => T,
  ifObj: (c: Character) => T,
  ifNeither?: T,
): T {
  if (typeof input === "number") {
    return ifId(input);
  }
  if (typeof input === "object") {
    return ifObj(input);
  }
  if (ifNeither) {
    return ifNeither;
  }
  throw new Error("Input to fromEither was neither CharacterId nor Character: " + input);
}

export function fromId<T>(input: CharacterInput, ifId: (c: CharacterId) => T, ifNeither?: T): T {
  return fromEither(input, ifId, c => ifId(c.id), ifNeither);
}

export function fromIdUnsafely<T>(input: CharacterInput, ifId: (c: CharacterId) => T | undefined): T {
  return fromEitherUnsafely(input, ifId, c => ifId(c.id));
}

export function fromIdSafely<T>(input: CharacterInput, ifId: (c: CharacterId) => T | undefined, ifNeither: T): T {
  const safeFunction: (c: CharacterId) => T = c => ifId(c) ?? ifNeither;
  return fromId(input, safeFunction, ifNeither);
}

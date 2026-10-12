import { customRegistry } from "#data/characters/live-data/custom-registry";
import type { CharacterId } from "#data/characters/types/character-types-enums";
import type { Character } from "../constant-data/character-data-objects";

export type CharacterInput = CharacterId | Character;

export function unfoldC(input: CharacterInput): [CharacterId, Character] {
  return [getCId(input), getCObj(input)];
}

export function getCId(input: CharacterInput) {
  return fromC(
    input,
    id => id,
    char => char.id,
  );
}

export function getCObj(input: CharacterInput) {
  return fromC(
    input,
    id => customRegistry.getCharacter(id),
    char => char,
  );
}

export function fromCUnsafely<T>(
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
  throw new Error("Result of fromCUnsafely was undefined or null.");
}

export function fromC<T>(
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
  throw new Error("Input to fromC was neither CharacterId nor Character: " + input);
}

export function fromCId<T>(input: CharacterInput, ifId: (c: CharacterId) => T, ifNeither?: T): T {
  return fromC(input, ifId, c => ifId(c.id), ifNeither);
}

export function fromCIdUnsafely<T>(input: CharacterInput, ifId: (c: CharacterId) => T | undefined): T {
  return fromCUnsafely(input, ifId, c => ifId(c.id));
}

export function fromCIdSafely<T>(input: CharacterInput, ifId: (c: CharacterId) => T | undefined, ifNeither: T): T {
  const safeFunction: (c: CharacterId) => T = c => ifId(c) ?? ifNeither;
  return fromCId(input, safeFunction, ifNeither);
}

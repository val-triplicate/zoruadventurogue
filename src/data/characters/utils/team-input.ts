import type { TeamId } from "#data/characters/types/character-types-enums";
import type { Team } from "#data/characters/types/character-types-objects";

export type TeamInput = TeamId | Team;

export function getTId(input: TeamInput) {
  return fromT(
    input,
    id => id,
    char => char.id,
  );
}

export function fromTUnsafely<T>(
  input: TeamId | Team,
  ifId: (c: TeamId) => T | undefined,
  ifObj: (c: Team) => T | undefined,
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
  throw new Error("Result of fromTUnsafely was undefined or null.");
}

export function fromT<T>(input: TeamId | Team, ifId: (c: TeamId) => T, ifObj: (c: Team) => T, ifNeither?: T): T {
  if (typeof input === "number") {
    return ifId(input);
  }
  if (typeof input === "object") {
    return ifObj(input);
  }
  if (ifNeither) {
    return ifNeither;
  }
  throw new Error("Input to fromT was neither TeamId nor Team: " + input);
}

export function fromTId<T>(input: TeamInput, ifId: (c: TeamId) => T, ifNeither?: T): T {
  return fromT(input, ifId, c => ifId(c.id), ifNeither);
}

export function fromTIdUnsafely<T>(input: TeamInput, ifId: (c: TeamId) => T | undefined): T {
  return fromTUnsafely(input, ifId, c => ifId(c.id));
}

export function fromTIdSafely<T>(input: TeamInput, ifId: (c: TeamId) => T | undefined, ifNeither: T): T {
  const safeFunction: (c: TeamId) => T = c => ifId(c) ?? ifNeither;
  return fromTId(input, safeFunction, ifNeither);
}

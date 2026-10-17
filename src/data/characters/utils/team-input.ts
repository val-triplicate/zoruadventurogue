import { customRegistry } from "#data/characters/live-data/custom-registry";
import type { TeamId } from "#data/characters/types/character-types-enums";
import type { Team } from "#data/characters/types/character-types-objects";

export type TeamInput = TeamId | Team;

export function unfoldT(input: TeamInput): [TeamId, Team] {
  return [getTId(input), getTObj(input)];
}

export function getTId(input: TeamInput) {
  return fromT(
    input,
    id => id,
    team => team.id,
  );
}

export function getTObj(input: TeamInput) {
  return fromT(
    input,
    id => customRegistry.getTeam(id),
    team => team,
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

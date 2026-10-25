export function searchArray<V>(array: V[], condition: (v: V) => boolean, errorMessage: string): V {
  for (const candidate of array) {
    if (candidate && condition(candidate)) {
      return candidate;
    }
  }
  throw new Error(errorMessage);
}

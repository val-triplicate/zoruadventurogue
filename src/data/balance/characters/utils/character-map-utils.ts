export function getFromMapUnsafely<K, V>(id: K, map: Map<K, V>, errorMessage: string): V {
  const output = map.get(id);
  if (output) {
    return output;
  }
  throw new Error(errorMessage);
}

export function getFromMapSafely<K, V>(id: K, map: Map<K, V>): V | undefined {
  return map.get(id);
}

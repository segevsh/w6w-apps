/** Drop `undefined` members so an unset optional field is absent from the JSON, not `null`. */
export function dropUndefined<T extends Record<string, unknown>>(value: T): T {
  return Object.fromEntries(Object.entries(value).filter(([, v]) => v !== undefined)) as T;
}

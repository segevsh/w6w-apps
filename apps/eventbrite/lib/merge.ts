type Obj = Record<string, unknown>;

function isPlainObject(v: unknown): v is Obj {
  return typeof v === "object" && v !== null && !Array.isArray(v);
}

/**
 * Deep-merge `src` into `target` (in place) and return `target`. Plain objects merge
 * key by key; anything else — arrays included — replaces the existing value. Used to
 * fold an action's free-form "Additional fields" into the body it built from typed params.
 */
export function deepMerge(target: Obj, src?: Obj): Obj {
  if (!src) return target;
  for (const [k, v] of Object.entries(src)) {
    const cur = target[k];
    target[k] = isPlainObject(v) && isPlainObject(cur) ? deepMerge({ ...cur }, v) : v;
  }
  return target;
}

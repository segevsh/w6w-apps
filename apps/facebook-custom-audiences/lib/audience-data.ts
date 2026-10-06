/**
 * Customer-file normalisation and SHA-256 hashing for the `/{audience}/users`
 * edge.
 *
 * Meta's "Customer File Custom Audiences" guide (checked 2026-10-05) lists one
 * normalisation rule per schema key and says every key except `MADID` and
 * `EXTERN_ID` requires hashing: "Provide SHA256 values for normalized keys and
 * HEX representations of this value, using lowercase for A through F". Its own
 * worked examples are the test vectors in `tests/lib/audience-data.test.ts`:
 *
 *   sha256("mary@example.com") = f1904cf1a9d73a55fa5de0ac823c4403ded71afd4c3248d00bdcd0866552bb79
 *   sha256("15559876543")      = 1ef970831d7963307784fa8688e8fce101a15685d62aa765fed23f3a2c576a4e
 *
 * Invariant: no value for a hashed key reaches `ctx.fetch` unless it matches
 * `^[a-f0-9]{64}$`. Errors name the row and the field, NEVER the value — hook
 * errors are persisted with the run, and an error reading `bad email: x@y.z`
 * would put the PII this module exists to protect into the run log.
 */

export const SHA256_HEX = /^[a-f0-9]{64}$/;

/** Wire schema keys, in the fixed order columns are emitted. */
export const SCHEMA_KEYS = [
  "EMAIL",
  "PHONE",
  "GEN",
  "DOBY",
  "DOBM",
  "DOBD",
  "LN",
  "FN",
  "FI",
  "CT",
  "ST",
  "ZIP",
  "COUNTRY",
  "MADID",
  "EXTERN_ID",
] as const;

export type SchemaKey = typeof SCHEMA_KEYS[number];

/** Keys Meta says must NOT be hashed. */
const UNHASHED: ReadonlySet<SchemaKey> = new Set(["MADID", "EXTERN_ID"]);

/** Friendly row keys (compared lower-cased with `_`/`-`/spaces removed) to schema keys. */
const ALIASES: Record<string, SchemaKey> = {
  email: "EMAIL",
  phone: "PHONE",
  gen: "GEN",
  gender: "GEN",
  doby: "DOBY",
  birthyear: "DOBY",
  dobm: "DOBM",
  birthmonth: "DOBM",
  dobd: "DOBD",
  birthday: "DOBD",
  ln: "LN",
  lastname: "LN",
  fn: "FN",
  firstname: "FN",
  fi: "FI",
  firstinitial: "FI",
  ct: "CT",
  city: "CT",
  st: "ST",
  state: "ST",
  zip: "ZIP",
  zipcode: "ZIP",
  postalcode: "ZIP",
  country: "COUNTRY",
  madid: "MADID",
  mobileadvertiserid: "MADID",
  externid: "EXTERN_ID",
  externalid: "EXTERN_ID",
};

export type HashingMode = "auto" | "pre-hashed";

/** Thrown for every rejection here. Never carries the offending value. */
export class AudienceDataError extends Error {
  constructor(public readonly field: string, public readonly detail: string) {
    super(`${field}: ${detail}`);
    this.name = "AudienceDataError";
  }
}

/** Lowercase hex SHA-256 of the UTF-8 bytes of `input` (WebCrypto). */
export async function sha256Hex(input: string): Promise<string> {
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(input));
  return Array.from(new Uint8Array(digest))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

const LETTERS = /[^\p{L}]/gu;

/** Apply Meta's per-key normalisation. Input is already trimmed and lower-cased. */
export function normalizeValue(key: SchemaKey, value: string, now = new Date()): string {
  switch (key) {
    case "EMAIL": {
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) {
        throw new AudienceDataError("EMAIL", "does not look like an email address");
      }
      return value;
    }
    case "PHONE": {
      // "Remove symbols, letters, and any leading zeroes."
      const digits = value.replace(/\D/g, "").replace(/^0+/, "");
      if (!digits) throw new AudienceDataError("PHONE", "has no digits after normalisation");
      return digits;
    }
    case "GEN": {
      const initial = value.slice(0, 1);
      if (initial !== "m" && initial !== "f") {
        throw new AudienceDataError("GEN", 'must be "m" or "f"');
      }
      return initial;
    }
    case "DOBY": {
      if (!/^\d{4}$/.test(value) || Number(value) < 1900 || Number(value) > now.getUTCFullYear()) {
        throw new AudienceDataError("DOBY", "must be a four-digit year from 1900 to this year");
      }
      return value;
    }
    case "DOBM": {
      const n = Number(value);
      if (!/^\d{1,2}$/.test(value) || n < 1 || n > 12) {
        throw new AudienceDataError("DOBM", "must be a month from 01 to 12");
      }
      return String(n).padStart(2, "0");
    }
    case "DOBD": {
      const n = Number(value);
      if (!/^\d{1,2}$/.test(value) || n < 1 || n > 31) {
        throw new AudienceDataError("DOBD", "must be a day from 01 to 31");
      }
      return String(n).padStart(2, "0");
    }
    case "LN":
    case "FN":
    case "CT": {
      // Letters only, lowercase, no punctuation or whitespace. `\p{L}` keeps
      // non-ASCII letters, which Meta asks to be sent "in UTF-8 format".
      const out = value.replace(LETTERS, "");
      if (!out) throw new AudienceDataError(key, "has no letters after normalisation");
      return out;
    }
    case "FI": {
      const out = value.replace(LETTERS, "").slice(0, 1);
      if (!out) throw new AudienceDataError("FI", "has no letters after normalisation");
      return out;
    }
    case "ST": {
      // US: the 2-character code, lowercase. Elsewhere: lowercase with no
      // punctuation, special characters or whitespace.
      const out = value.replace(/[^\p{L}\p{N}]/gu, "");
      if (!out) throw new AudienceDataError("ST", "is empty after normalisation");
      return out;
    }
    case "ZIP": {
      // Lowercase, no whitespace; US ZIP+4 is cut to its first 5 digits. Other
      // postcodes are left as given (Meta asks for the UK Area/District/Sector
      // form, which this app cannot derive).
      const out = value.replace(/\s/g, "");
      const us = /^(\d{5})-\d{4}$/.exec(out);
      const res = us ? us[1] : out;
      if (!res) throw new AudienceDataError("ZIP", "is empty after normalisation");
      return res;
    }
    case "COUNTRY": {
      if (!/^[a-z]{2}$/.test(value)) {
        throw new AudienceDataError("COUNTRY", "must be a 2-letter ISO 3166-1 alpha-2 code");
      }
      return value;
    }
    case "MADID":
    case "EXTERN_ID":
      return value;
  }
}

/** Resolve a caller's row key to a schema key, or throw (key names are not PII). */
export function resolveKey(rowKey: string): SchemaKey {
  const found = ALIASES[rowKey.toLowerCase().replace(/[\s_-]/g, "")];
  if (!found) {
    throw new AudienceDataError(
      "users",
      `unknown column "${rowKey}" — use one of: ${Object.keys(ALIASES).join(", ")}`,
    );
  }
  return found;
}

async function prepareCell(
  key: SchemaKey,
  input: unknown,
  mode: HashingMode,
  row: number,
): Promise<string> {
  const where = `users[${row}].${key}`;
  if (typeof input !== "string" && typeof input !== "number") {
    throw new AudienceDataError(where, "must be a string");
  }
  // MADID is documented as "all lowercase, keep hyphens"; EXTERN_ID is sent as
  // given so it matches the same ID used on other channels.
  const raw = String(input).trim();
  if (key === "EXTERN_ID") return raw;
  const value = raw.toLowerCase();
  if (!value) return "";

  if (UNHASHED.has(key)) return value;

  // Already a SHA-256 digest: pass through, in both modes.
  if (SHA256_HEX.test(value)) return value;

  if (mode === "pre-hashed") {
    throw new AudienceDataError(
      where,
      "is not a lowercase SHA-256 hex digest, but hashing is set to pre-hashed — " +
        "switch Hashing to Automatic to let this app normalise and hash it",
    );
  }

  let normalized: string;
  try {
    normalized = normalizeValue(key, value);
  } catch (e) {
    if (e instanceof AudienceDataError) throw new AudienceDataError(where, e.detail);
    throw e;
  }
  const hashed = await sha256Hex(normalized);
  // Post-condition: nothing hashable leaves this module in the clear.
  if (!SHA256_HEX.test(hashed)) throw new AudienceDataError(where, "failed to produce a digest");
  return hashed;
}

export interface PreparedUsers {
  schema: SchemaKey[];
  data: string[][];
}

/**
 * Turn caller rows into Meta's `{ schema, data }` payload.
 *
 * The schema is the union of columns present across all rows, in
 * {@link SCHEMA_KEYS} order; a row missing a column gets `""`, which is how
 * Meta says "this key is unknown" in a multi-key upload. A single-column
 * schema is sent as a one-element array (`["EMAIL"]`), which Meta accepts as a
 * multi-key schema of one.
 */
export async function prepareUsers(
  rows: unknown,
  mode: HashingMode = "auto",
): Promise<PreparedUsers> {
  if (!Array.isArray(rows) || rows.length === 0) {
    throw new Error("users must be a non-empty array of objects");
  }
  const resolved: Array<Map<SchemaKey, unknown>> = [];
  const present = new Set<SchemaKey>();
  rows.forEach((row, i) => {
    if (row === null || typeof row !== "object" || Array.isArray(row)) {
      throw new AudienceDataError(`users[${i}]`, "must be an object");
    }
    const m = new Map<SchemaKey, unknown>();
    for (const [k, v] of Object.entries(row as Record<string, unknown>)) {
      if (v === undefined || v === null || v === "") continue;
      const key = resolveKey(k);
      m.set(key, v);
      present.add(key);
    }
    resolved.push(m);
  });
  const schema = SCHEMA_KEYS.filter((k) => present.has(k));
  if (schema.length === 0) throw new Error("users carry no values to upload");

  const data: string[][] = [];
  for (let i = 0; i < resolved.length; i++) {
    const cells: string[] = [];
    for (const key of schema) {
      const v = resolved[i].get(key);
      cells.push(v === undefined ? "" : await prepareCell(key, v, mode, i));
    }
    if (cells.every((c) => c === "")) {
      throw new AudienceDataError(`users[${i}]`, "has no usable values");
    }
    data.push(cells);
  }
  return { schema, data };
}

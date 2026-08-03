/**
 * Customer-information (`user_data`) normalisation, hashing and validation.
 *
 * This is the part of the app that matters. Meta requires the contact fields of
 * `user_data` to be **normalised and then SHA-256 hashed** before transmission:
 *
 *   "Our systems are designed to not accept customer information that is
 *    unhashed Contact Information, unless noted below... If you are using the
 *    Meta Business SDK, the hashing is done automatically."
 *   — developers.facebook.com/docs/marketing-api/conversions-api/parameters/
 *     customer-information-parameters (checked 2026-08-03)
 *
 * Sending raw PII is a correctness failure (Meta rejects it, or it simply never
 * matches a person) *and* a privacy failure. So this module is the app's
 * gatekeeper: no value for a hashed field ever reaches `ctx.fetch` unless it
 * matches `^[a-f0-9]{64}$`. That is asserted as a post-condition, not merely
 * hoped for.
 *
 * ## Where the normalisation rules come from
 *
 * Two sources, and they do not fully agree:
 *
 *   1. The customer-information-parameters doc page (prose).
 *   2. Meta's own Business SDK — the executable spec, and what actually
 *      produces the hashes the rest of the ecosystem sends:
 *      `facebook-python-business-sdk/facebook_business/adobjects/serverside/
 *       normalize.py` (read verbatim 2026-08-03).
 *
 * Where they disagree, the **SDK wins**, because a hash only has value if it is
 * byte-identical to the one every other integration produces. The divergences
 * are called out field by field below and summarised in README.md.
 *
 * ## Errors never echo the value
 *
 * Every error thrown here names the *field*, never the value. Hook errors are
 * surfaced to the user and persisted with the run; an error message reading
 * `invalid email: alice@example.com` would put the exact PII this module exists
 * to protect into the run log. Meta's own SDK does interpolate the value into
 * its exceptions; this module deliberately does not.
 */

/** A normalised, SHA-256 hashed value, lowercase hex. */
export const SHA256_HEX = /^[a-f0-9]{64}$/;

/**
 * MD5 is accepted by some other Meta surfaces (and `Normalize.is_already_hashed`
 * in the Business SDK treats it as "already hashed"), but the Conversions API
 * wants SHA-256. A 32-hex value is therefore neither raw nor usable, and
 * silently re-hashing it would produce sha256(md5(x)) — a hash that matches
 * nothing. Rejected loudly instead.
 */
const MD5_HEX = /^[a-f0-9]{32}$/;

/** SDK: `location_excluded_chars` — digits, period, whitespace, dash, parens. */
const LOCATION_EXCLUDED = /[0-9.\s\-()]/g;
/** SDK: `isocode_included_chars` — everything that is not a lowercase letter. */
const NON_ALPHA = /[^a-z]/g;
/** SDK: `email_pattern`. Deliberately loose — Meta's own liveness bar. */
const EMAIL_PATTERN = /.+@.+\..+/;
/** SDK: `international_number_regex`, applied after symbols are stripped. */
const PHONE_INTERNATIONAL = /^\d{1,4}\(?\d{2,3}\)?\d{4,}$/;

/**
 * Fields Meta REQUIRES normalised + SHA-256 hashed. Nothing in this list is
 * ever transmitted in the clear, in either hashing mode.
 */
export const HASHED_KEYS = [
  "em",
  "ph",
  "fn",
  "ln",
  "db",
  "ge",
  "ct",
  "st",
  "zp",
  "country",
] as const;

export type HashedKey = typeof HASHED_KEYS[number];

/**
 * Fields Meta requires **in the clear** — hashing them breaks them.
 * (`external_id` is deliberately not here; see PASSTHROUGH_NOTE below.)
 */
export const RAW_KEYS = [
  "client_ip_address",
  "client_user_agent",
  "fbc",
  "fbp",
  "subscription_id",
  "fb_login_id",
  "lead_id",
  "anon_id",
  "madid",
  "page_id",
  "page_scoped_user_id",
  "ctwa_clid",
  "ig_account_id",
  "ig_sid",
] as const;

/**
 * `external_id` is the one field the two sources disagree about outright: the
 * doc page says "Hashing Recommended", while `UserData.normalize()` in the
 * Business SDK passes `external_id` through **verbatim** (it is deduped, not
 * normalised and not hashed). The SDK behaviour wins for the reason stated at
 * the top of this file, reinforced by Meta's own instruction to "send it in the
 * same format as other channels" — hashing here while a sibling channel sends
 * it raw would silently destroy the join. It is passed through untouched, and a
 * caller who wants it hashed can hash it upstream: a 64-hex value survives this
 * module unchanged either way.
 */
const PASSTHROUGH_KEYS = ["external_id"] as const;

const HASHED = new Set<string>(HASHED_KEYS);
const RAW = new Set<string>(RAW_KEYS);
const PASSTHROUGH = new Set<string>(PASSTHROUGH_KEYS);

/**
 * Whether the app hashes on the caller's behalf.
 *
 *  - `auto` (default) — a value already matching `^[a-f0-9]{64}$` is passed
 *    through untouched; anything else is normalised per Meta's rules and
 *    hashed. This is exactly what Meta's Business SDK does
 *    (`Normalize.is_already_hashed` short-circuits the same way).
 *  - `pre-hashed` — every REQUIRED-hashed field must already be a SHA-256 hex
 *    digest. Anything else throws. Use this when the upstream system stores
 *    hashes and raw PII must never enter a workflow variable at all.
 *
 * Neither mode can forward an unhashed contact field: `auto` hashes it,
 * `pre-hashed` refuses it.
 */
export type HashingMode = "auto" | "pre-hashed";

/** Thrown for every rejection in this module. Never carries the offending value. */
export class UserDataError extends Error {
  constructor(public readonly field: string, message: string) {
    super(`user_data.${field}: ${message}`);
    this.name = "UserDataError";
  }
}

/** Lowercase hex SHA-256 of the UTF-8 bytes of `input`. */
export async function sha256Hex(input: string): Promise<string> {
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(input));
  return Array.from(new Uint8Array(digest))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

/**
 * Apply Meta's per-field normalisation. Input is already lowercased + trimmed
 * (the SDK does that for every field before branching, and so do we).
 */
function normalizeHashedField(key: string, value: string): string {
  switch (key) {
    /** SDK `em`: validate `.+@.+\..+`; lowercase + trim is the whole normalisation. */
    case "em": {
      if (!EMAIL_PATTERN.test(value)) {
        throw new UserDataError("em", "does not look like an email address");
      }
      return value;
    }

    /**
     * SDK `ph`: strip whitespace/dash/parens, then strip a leading `+` and up
     * to two leading zeros, then require an international number WITH country
     * code. A number still starting with `0` is a national-format number and is
     * rejected — Meta cannot match it. Note the doc page's looser wording
     * ("remove symbols, letters") would silently accept `+1-650-555-1234 ext 9`;
     * the SDK's regex rejects it, which is the behaviour we want.
     */
    case "ph": {
      const stripped = value.replace(/[\s\-()]/g, "").replace(/^\+?0{0,2}/, "");
      if (stripped.startsWith("0")) {
        throw new UserDataError(
          "ph",
          "still starts with a trunk zero after normalisation — send E.164 with a country code",
        );
      }
      if (!PHONE_INTERNATIONAL.test(stripped)) {
        throw new UserDataError(
          "ph",
          "is not an international phone number — include the country code and digits only",
        );
      }
      return stripped;
    }

    /**
     * SDK `fn` / `ln`: no branch at all, so the normalisation is exactly
     * lowercase + trim. The doc page additionally says "no punctuation", which
     * would turn `o'brien` into `obrien` and stop matching every hash the
     * Business SDK has ever produced for that name. The SDK wins; see README.
     */
    case "fn":
    case "ln":
      return value;

    /**
     * `db`: neither `normalize.py` nor `UserData.normalize()` reshapes `db` —
     * the SDK hashes whatever string it is handed, and only offers per-part
     * `dobd`/`dobm`/`doby` helpers with real validation. That is a gap, not a
     * rule: the doc page is unambiguous that the wire format is `YYYYMMDD`
     * ("with or without punctuation"), so punctuation is stripped and the
     * result range-checked. Hashing `1985-04-12` verbatim would never match.
     */
    case "db": {
      const digits = value.replace(/[^0-9]/g, "");
      if (digits.length !== 8) {
        throw new UserDataError("db", "must be a date of birth in YYYYMMDD form");
      }
      const year = Number(digits.slice(0, 4));
      const month = Number(digits.slice(4, 6));
      const day = Number(digits.slice(6, 8));
      if (year < 1900 || month < 1 || month > 12 || day < 1 || day > 31) {
        throw new UserDataError("db", "is not a plausible YYYYMMDD date of birth");
      }
      return digits;
    }

    /**
     * `ge`: the doc page says "an initial in lowercase" — `f` or `m`. The SDK
     * gets there by construction (its `Gender` enum's values are already `f`
     * and `m`) rather than by normalising, so the mapping has to live here or
     * a caller passing `female` would hash a string Meta never matches.
     */
    case "ge": {
      const initial = value.slice(0, 1);
      if (initial !== "f" && initial !== "m") {
        throw new UserDataError("ge", 'must be "f" or "m"');
      }
      return initial;
    }

    /** SDK `ct` / `st`: drop digits, periods, whitespace, dashes and parens. */
    case "ct":
    case "st": {
      const out = value.replace(LOCATION_EXCLUDED, "");
      if (!out) throw new UserDataError(key, "is empty after normalisation");
      return out;
    }

    /**
     * SDK `zp`: strip whitespace, then keep the part before the first `-`
     * (US ZIP+4 becomes the 5-digit base). Note the SDK does NOT truncate to 5
     * characters — doing so would mangle every non-US postcode — so neither do
     * we, despite the doc page's "first 5 digits for U.S. zip codes".
     */
    case "zp": {
      const out = value.replace(/\s/g, "").split("-")[0];
      if (!out) throw new UserDataError("zp", "is empty after normalisation");
      return out;
    }

    /** SDK `country`: strip non-alpha, then validate ISO 3166-1 alpha-2. */
    case "country": {
      const out = value.replace(NON_ALPHA, "");
      if (out.length !== 2) {
        throw new UserDataError(
          "country",
          "must be a two-letter ISO 3166-1 alpha-2 code (e.g. us)",
        );
      }
      return out;
    }

    default:
      return value;
  }
}

/** Turn one value for a required-hashed field into its SHA-256 digest. */
async function prepareHashedValue(
  key: string,
  input: unknown,
  mode: HashingMode,
): Promise<string> {
  if (typeof input !== "string" && typeof input !== "number") {
    throw new UserDataError(key, "must be a string");
  }
  const value = String(input).toLowerCase().trim();
  if (!value) throw new UserDataError(key, "is empty");

  if (MD5_HEX.test(value)) {
    throw new UserDataError(
      key,
      "looks like an MD5 digest; the Conversions API requires SHA-256",
    );
  }

  // Already hashed: pass through untouched, in BOTH modes. This is the
  // short-circuit Meta's own SDK performs (`Normalize.is_already_hashed`).
  if (SHA256_HEX.test(value)) return value;

  if (mode === "pre-hashed") {
    // The loud failure the pre-hashed contract exists to provide. `@` is
    // singled out because a raw email is the overwhelmingly common mistake and
    // deserves to say so by name — without repeating the address itself.
    throw new UserDataError(
      key,
      value.includes("@")
        ? "looks like a raw email address, but hashing is set to pre-hashed — " +
          "supply a lowercase SHA-256 hex digest, or switch Hashing to Automatic"
        : "is not a lowercase SHA-256 hex digest (64 hex characters), but hashing " +
          "is set to pre-hashed — switch Hashing to Automatic to let this app " +
          "normalise and hash it",
    );
  }

  const hashed = await sha256Hex(normalizeHashedField(key, value));

  // Post-condition. Belt and braces: whatever route a value took through the
  // switch above, it does not leave this module in the clear.
  if (!SHA256_HEX.test(hashed)) {
    throw new UserDataError(key, "failed to produce a SHA-256 digest");
  }
  return hashed;
}

/** Meta accepts `string | list<string>` for the hashed identity fields. */
async function prepareHashedEntry(
  key: string,
  input: unknown,
  mode: HashingMode,
): Promise<string | string[]> {
  if (Array.isArray(input)) {
    const out: string[] = [];
    for (const item of input) out.push(await prepareHashedValue(key, item, mode));
    return [...new Set(out)];
  }
  return await prepareHashedValue(key, input, mode);
}

/**
 * Normalise, hash and validate a `user_data` object.
 *
 * Unrecognised keys are passed through untouched — Meta adds `user_data`
 * members faster than any app can track (`ig_sid` and `ctwa_clid` are recent),
 * and refusing them would break an integration for no safety gain. Every key
 * Meta documents as requiring a hash is in {@link HASHED_KEYS} and is enforced.
 */
export async function prepareUserData(
  raw: unknown,
  mode: HashingMode = "auto",
): Promise<Record<string, unknown>> {
  if (raw === null || typeof raw !== "object" || Array.isArray(raw)) {
    throw new Error("user_data must be an object");
  }

  const out: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(raw as Record<string, unknown>)) {
    if (value === undefined || value === null || value === "") continue;

    if (HASHED.has(key)) {
      out[key] = await prepareHashedEntry(key, value, mode);
      continue;
    }

    if (RAW.has(key)) {
      // The mirror-image mistake: hashing a field Meta needs in the clear.
      // A hashed IP silently destroys geo/attribution rather than erroring at
      // Meta, so it is worth catching here.
      if (typeof value === "string" && SHA256_HEX.test(value.toLowerCase())) {
        throw new UserDataError(
          key,
          "looks like a SHA-256 digest, but Meta requires this field unhashed",
        );
      }
      out[key] = value;
      continue;
    }

    if (PASSTHROUGH.has(key)) {
      out[key] = value;
      continue;
    }

    out[key] = value;
  }

  if (Object.keys(out).length === 0) {
    throw new Error("user_data is empty — the Conversions API requires at least one identifier");
  }
  return out;
}

/** A Conversions API server event, as documented under `data[]`. */
export interface ServerEvent {
  event_name: string;
  event_time: number;
  action_source: string;
  user_data: Record<string, unknown>;
  event_id?: string;
  event_source_url?: string;
  opt_out?: boolean;
  custom_data?: Record<string, unknown>;
  app_data?: Record<string, unknown>;
  referrer_url?: string;
  data_processing_options?: string[];
  data_processing_options_country?: number;
  data_processing_options_state?: number;
  [key: string]: unknown;
}

/**
 * Run one caller-supplied server event through {@link prepareUserData}, leaving
 * every other member of the event alone. Returns a copy; the input is not
 * mutated.
 */
export async function prepareEvent(
  event: unknown,
  mode: HashingMode = "auto",
  index?: number,
): Promise<ServerEvent> {
  if (event === null || typeof event !== "object" || Array.isArray(event)) {
    throw new Error(`data[${index ?? 0}] must be an object`);
  }
  const source = event as Record<string, unknown>;
  if (!source.user_data) {
    throw new Error(
      `data[${index ?? 0}] has no user_data — the Conversions API requires it on every event`,
    );
  }
  try {
    return { ...source, user_data: await prepareUserData(source.user_data, mode) } as ServerEvent;
  } catch (e) {
    if (index === undefined) throw e;
    const message = e instanceof Error ? e.message : String(e);
    throw new Error(`data[${index}] ${message}`);
  }
}

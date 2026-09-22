/**
 * The shared plumbing for every Firestore action.
 *
 * Everything here was checked against the Cloud Firestore discovery document
 * the API serves from its own host
 * (`https://firestore.googleapis.com/$discovery/rest?version=v1`, fetched
 * 2026-09-22, `revision` `20260911`, 320,319 bytes), which states `rootUrl`
 * `https://firestore.googleapis.com/` and an **empty** `servicePath` — so the
 * `v1/` segment is part of every path and lives here, once.
 *
 * Two facts shape this file:
 *
 *  1. **Every path parameter is a resource *name*, not an id.** A document is
 *     `projects/{project}/databases/{database}/documents/{collectionPath}/{id}`
 *     and the collection id is its own path segment, never part of a `parent`.
 *     `documentsRoot`/`documentName`/`collectionParent` below are the only
 *     places that string is assembled, so no action can get it subtly wrong.
 *  2. **Every leaf value is a typed-union object.** Firestore has no bare-JSON
 *     shortcut: `fields: {age: {integerValue: "36"}}`, not `fields: {age: 36}`.
 *     {@link toValue}/{@link fromValue} are the translation, and they are the
 *     highest-value code in this app — a wrong conversion silently stores the
 *     wrong type rather than failing.
 *
 * `Document.name`, `createTime` and `updateTime` are the server's, and every
 * partition under `projects/{project}/databases/{database}` differs only in the
 * `database` segment — `(default)` unless the Connection names another.
 */
import type { HookContext, RedactedConnection } from "@w6w/types";

/** Firestore's REST base. The discovery doc's `rootUrl` + its `v1/` prefix. */
export const API_URL = "https://firestore.googleapis.com/v1";

/** The database every project gets for free, and the usual value here. */
export const DEFAULT_DATABASE = "(default)";

/** Public (redacted-safe) connection metadata, set by `auth/oauth2.ts`. */
export interface FirestoreConnectionDisplay {
  /** The Google Cloud project every path is scoped to. */
  projectId?: string;
  /** The database id, normally `(default)`. */
  databaseId?: string;
}

/**
 * The project: the action's override wins, else the Connection's.
 *
 * Firestore has no "my project" shortcut — every single path begins with a
 * project id, so this is collected once on the Connection rather than typed
 * into every action.
 */
export function resolveProject(
  connection: RedactedConnection | undefined,
  override?: unknown,
): string {
  const explicit = String(override ?? "").trim();
  if (explicit) return explicit;
  const display = (connection?.display ?? {}) as FirestoreConnectionDisplay;
  const fromConnection = display.projectId?.trim();
  if (fromConnection) return fromConnection;
  throw new Error("no Google Cloud project — set one on the connection or pass `projectId`");
}

/** The database id: the action's override, else the Connection's, else `(default)`. */
export function resolveDatabase(
  connection: RedactedConnection | undefined,
  override?: unknown,
): string {
  const explicit = String(override ?? "").trim();
  if (explicit) return explicit;
  const display = (connection?.display ?? {}) as FirestoreConnectionDisplay;
  return display.databaseId?.trim() || DEFAULT_DATABASE;
}

/** `projects/{project}/databases/{database}` — what the `:commit`-style RPCs take. */
export function databaseName(project: string, database: string): string {
  return `projects/${project}/databases/${database}`;
}

/** `.../documents` — the root every collection path hangs off. */
export function documentsRoot(project: string, database: string): string {
  return `${databaseName(project, database)}/documents`;
}

/** Split a request path into its non-empty segments. */
export function pathSegments(path: string): string[] {
  return String(path ?? "")
    .split("/")
    .map((s) => s.trim())
    .filter(Boolean);
}

/**
 * A document's resource name from a path relative to the documents root
 * (`users/alice/orders/o1`). A full `projects/...` name is passed through
 * untouched, so a reference copied off another document's `referenceValue`
 * works directly.
 *
 * A document path has an **even** number of segments (collection, id, …); an
 * odd one names a collection, which is a different request.
 */
export function documentName(project: string, database: string, pathOrName: string): string {
  const raw = String(pathOrName ?? "").trim().replace(/^\/+|\/+$/g, "");
  if (!raw) throw new Error("`path` is required");
  if (raw.startsWith("projects/")) return raw;
  const segments = pathSegments(raw);
  if (segments.length % 2 !== 0) {
    throw new Error(
      `\`path\` \`${raw}\` names a collection, not a document — a document path has an even ` +
        `number of segments (collection/document/collection/document)`,
    );
  }
  return `${documentsRoot(project, database)}/${segments.join("/")}`;
}

/**
 * The `{parent, collectionId}` pair a list/create/query request needs, from a
 * collection path relative to the documents root (`users` or `users/alice/orders`).
 *
 * The collection id is deliberately a **separate** request field — that is the
 * shape the API documents, and it is also why a collection path has an **odd**
 * number of segments.
 */
export function collectionParent(
  project: string,
  database: string,
  path: string,
): { parent: string; collectionId: string } {
  const segments = pathSegments(path);
  if (segments.length === 0 || segments.length % 2 !== 1) {
    throw new Error(
      `\`collectionPath\` \`${String(path ?? "")}\` is not a collection path — it must have an ` +
        `odd number of segments (collection or collection/document/collection)`,
    );
  }
  const collectionId = segments[segments.length - 1];
  const parentPath = segments.slice(0, -1).join("/");
  const parent = parentPath
    ? `${documentsRoot(project, database)}/${parentPath}`
    : documentsRoot(project, database);
  return { parent, collectionId };
}

// ------------------------------------------------------------------ values --

/**
 * The eleven leaf arms of `schemas.Value` that a *document write* may carry.
 *
 * The discovery doc's `Value` also lists `pipelineValue`, `fieldReferenceValue`,
 * `variableReferenceValue` and `functionValue`; all four are documented "Not
 * allowed to be used when writing documents", so they are deliberately *not*
 * recognized here — sending one would be an error at the API, and pretending to
 * support it would only hide that.
 */
export const VALUE_KEYS = [
  "nullValue",
  "booleanValue",
  "integerValue",
  "doubleValue",
  "stringValue",
  "timestampValue",
  "bytesValue",
  "referenceValue",
  "geoPointValue",
  "arrayValue",
  "mapValue",
] as const;

const VALUE_KEY_SET = new Set<string>(VALUE_KEYS);

/** A Firestore `Value`, as it appears on the wire. */
export interface FirestoreValue {
  nullValue?: null;
  booleanValue?: boolean;
  integerValue?: string;
  doubleValue?: number;
  stringValue?: string;
  timestampValue?: string;
  bytesValue?: string;
  referenceValue?: string;
  geoPointValue?: { latitude?: number; longitude?: number };
  arrayValue?: { values?: FirestoreValue[] };
  mapValue?: { fields?: Record<string, FirestoreValue> };
}

/** A Firestore `Document` as it appears on the wire. */
export interface FirestoreDocument {
  name?: string;
  fields?: Record<string, FirestoreValue>;
  createTime?: string;
  updateTime?: string;
}

function isTypedValue(input: Record<string, unknown>): string | undefined {
  const keys = Object.keys(input);
  if (keys.length !== 1) return undefined;
  return VALUE_KEY_SET.has(keys[0]) ? keys[0] : undefined;
}

function num(value: unknown, field: string): number {
  const n = typeof value === "number" ? value : Number(String(value ?? "").trim());
  if (!Number.isFinite(n)) throw new Error(`\`${field}\` must be a finite number`);
  return n;
}

/** Normalize an explicitly tagged `integerValue` (number or numeric string). */
function integerString(value: unknown): string {
  if (typeof value === "number") {
    if (!Number.isInteger(value)) throw new Error("`integerValue` must be a whole number");
    return String(value);
  }
  const s = String(value ?? "").trim();
  if (!/^-?\d+$/.test(s)) throw new Error("`integerValue` must be a whole number");
  return s;
}

/**
 * Plain JS → one `Value`.
 *
 * The mapping is the obvious one (string → `stringValue`, whole number →
 * `integerValue` *as a string*, other number → `doubleValue`, …) plus one
 * escape hatch: an object with exactly one key from {@link VALUE_KEYS} is taken
 * as an already-typed value and passed through. That is how a workflow sends
 * what plain JSON cannot express — a timestamp, a geopoint, base64 bytes, or a
 * document reference:
 *
 * ```jsonc
 * { "at":       { "timestampValue": "2026-09-22T10:00:00Z" },
 *   "where":    { "geoPointValue": { "latitude": 51.5, "longitude": -0.1 } },
 *   "raw":      { "bytesValue": "aGk=" } }
 * ```
 *
 * A one-key object that *means* a map with that key (`{"stringValue": "x"}` as
 * data) is the one ambiguity, and it is inherent to the wire format; wrap it in
 * an explicit map, `{"mapValue": {"fields": {"stringValue": {"stringValue": "x"}}}}`.
 */
export function toValue(input: unknown): FirestoreValue {
  if (input === null || input === undefined) return { nullValue: null };

  switch (typeof input) {
    case "string":
      return { stringValue: input };
    case "boolean":
      return { booleanValue: input };
    case "number": {
      if (!Number.isFinite(input)) {
        throw new Error("cannot encode NaN or Infinity as a Firestore value");
      }
      // int64 is string-encoded on the wire; everything else is a double.
      return Number.isInteger(input) ? { integerValue: String(input) } : { doubleValue: input };
    }
    case "object": {
      if (Array.isArray(input)) {
        return { arrayValue: { values: input.map((item) => toValue(item)) } };
      }
      const obj = input as Record<string, unknown>;
      const tagged = isTypedValue(obj);
      if (tagged) return taggedValue(tagged, obj[tagged]);
      return { mapValue: { fields: encodeFields(obj) } };
    }
    default:
      throw new Error(`cannot encode a ${typeof input} as a Firestore value`);
  }
}

/** A value the caller already tagged with its wire type. */
function taggedValue(key: string, raw: unknown): FirestoreValue {
  switch (key) {
    case "nullValue":
      return { nullValue: null };
    case "booleanValue":
      return { booleanValue: Boolean(raw) };
    case "integerValue":
      return { integerValue: integerString(raw) };
    case "doubleValue":
      return { doubleValue: num(raw, "doubleValue") };
    case "stringValue":
      return { stringValue: String(raw ?? "") };
    case "timestampValue":
      return { timestampValue: String(raw ?? "") };
    case "bytesValue":
      return { bytesValue: String(raw ?? "") };
    case "referenceValue":
      return { referenceValue: String(raw ?? "") };
    case "geoPointValue": {
      const geo = (raw ?? {}) as { latitude?: unknown; longitude?: unknown };
      let parsed: unknown = geo;
      if (typeof raw === "string") {
        try {
          parsed = JSON.parse(raw);
        } catch {
          throw new Error("`geoPointValue` must be `{latitude, longitude}` or its JSON");
        }
      }
      const g = (parsed ?? {}) as { latitude?: unknown; longitude?: unknown };
      return {
        geoPointValue: {
          latitude: num(g.latitude, "geoPointValue.latitude"),
          longitude: num(g.longitude, "geoPointValue.longitude"),
        },
      };
    }
    case "arrayValue": {
      const a = (raw ?? {}) as { values?: unknown } | unknown[];
      const values = Array.isArray(a) ? a : ((a as { values?: unknown[] }).values ?? []);
      return { arrayValue: { values: values.map((item) => toValue(item)) } };
    }
    case "mapValue": {
      const m = (raw ?? {}) as { fields?: Record<string, unknown> };
      const fields = "fields" in m && m.fields ? m.fields : (m as Record<string, unknown>);
      return { mapValue: { fields: encodeFields(fields) } };
    }
    default:
      throw new Error(`\`${key}\` is not a writable Firestore value type`);
  }
}

/** Plain JS object → a document's `fields` map. `undefined` keys are skipped. */
export function encodeFields(
  input: Record<string, unknown> | undefined,
): Record<string, FirestoreValue> {
  const out: Record<string, FirestoreValue> = {};
  for (const [key, value] of Object.entries(input ?? {})) {
    if (value === undefined) continue;
    out[key] = toValue(value);
  }
  return out;
}

/**
 * One `Value` → plain JS.
 *
 * Two honest asymmetries with {@link toValue}:
 *   - `integerValue` is int64 and Firestore returns it as a **string**. It
 *     becomes a JS number only when that is lossless; beyond ±2^53 the string
 *     is returned untouched rather than silently rounded.
 *   - `timestampValue` stays the RFC3339 string the API sent. Turning it into a
 *     JS `Date` would drop sub-millisecond digits and re-format a value on the
 *     way out, and a workflow can parse it when it actually wants a Date.
 * `bytesValue` likewise stays base64, and `referenceValue` stays the full
 * document resource name.
 */
export function fromValue(value: FirestoreValue | undefined | null): unknown {
  if (value === null || value === undefined) return null;
  if ("nullValue" in value) return null;
  if ("stringValue" in value) return value.stringValue;
  if ("booleanValue" in value) return value.booleanValue;
  if ("integerValue" in value) {
    const s = String(value.integerValue);
    const n = Number(s);
    return Number.isSafeInteger(n) ? n : s;
  }
  if ("doubleValue" in value) return value.doubleValue;
  if ("timestampValue" in value) return value.timestampValue;
  if ("bytesValue" in value) return value.bytesValue;
  if ("referenceValue" in value) return value.referenceValue;
  if ("geoPointValue" in value) {
    const g = value.geoPointValue ?? {};
    return { latitude: g.latitude, longitude: g.longitude };
  }
  if ("arrayValue" in value) {
    return (value.arrayValue?.values ?? []).map((item) => fromValue(item));
  }
  if ("mapValue" in value) return decodeFields(value.mapValue?.fields);
  // Not a leaf this app knows (e.g. a pipeline-only arm). Returned verbatim
  // rather than dropped, so nothing is silently lost.
  return value;
}

/** A document's `fields` map → plain JS. */
export function decodeFields(
  fields: Record<string, FirestoreValue> | undefined,
): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(fields ?? {})) {
    out[key] = fromValue(value);
  }
  return out;
}

/**
 * The shape every read action returns: the raw `Document` plus its fields
 * decoded to plain JS under `data`. Both are kept because the raw form carries
 * the exact wire type (useful when *that* is what matters) while `data` is what
 * a workflow actually consumes.
 */
export function decodeDocument(doc: FirestoreDocument | undefined): Record<string, unknown> {
  if (!doc) return {};
  return { ...doc, data: decodeFields(doc.fields) };
}

/** The bare document id at the end of a resource name — `o1` from `…/orders/o1`. */
export function documentIdOf(name: string | undefined): string | undefined {
  const segments = pathSegments(name ?? "");
  return segments.length ? segments[segments.length - 1] : undefined;
}

/**
 * Parse a JSON-typed param, which arrives as either a string (a form) or a live
 * value (a workflow passing an object straight through).
 */
export function parseJson(value: unknown, field: string): unknown {
  if (value === undefined || value === null || value === "") return undefined;
  if (typeof value !== "string") return value;
  try {
    return JSON.parse(value);
  } catch {
    throw new Error(`\`${field}\` is not valid JSON`);
  }
}

// ------------------------------------------------------------------ errors --

/** Google's structured error envelope, as every Google API returns it. */
export interface GoogleErrorEnvelope {
  error?: { code?: number; status?: string; message?: string };
}

/** Parse an error body, or `undefined` when it is not the documented envelope. */
export function parseGoogleError(text: string): GoogleErrorEnvelope["error"] | undefined {
  try {
    const parsed = JSON.parse(text) as GoogleErrorEnvelope;
    return parsed?.error;
  } catch {
    return undefined;
  }
}

/**
 * Turn a failed response into a message.
 *
 * The **body** decides what happened, never the status code alone: Google's own
 * docs note that `PERMISSION_DENIED` (403) fires both for a token that is
 * genuinely bad and for a perfectly valid token on a project where the API is
 * not enabled, so `error.status`/`error.message` are what is reported. The HTTP
 * status is included as a hint, never as the verdict.
 */
export function describeGoogleError(status: number, statusText: string, text: string): string {
  const err = parseGoogleError(text);
  if (err) {
    const label = err.status ? `${err.status} (HTTP ${err.code ?? status})` : `HTTP ${status}`;
    return `${label}: ${err.message ?? "no message"}`;
  }
  const detail = text.trim().slice(0, 300);
  return `HTTP ${status} ${statusText}${detail ? `: ${detail}` : ""}`;
}

// ------------------------------------------------------------------ client --

export interface RequestOptions {
  method?: string;
  query?: Record<string, string | number | boolean | Array<string | number> | undefined | null>;
  /** JSON body; `undefined`/`null` sends none. */
  body?: unknown;
}

/**
 * Thin wrapper over `ctx.fetch`. It never touches `Authorization` — the runtime
 * applies the auth method's `sign` hook, which is the only place a credential
 * is allowed to exist.
 */
export class FirestoreClient {
  constructor(private ctx: HookContext) {}

  async request<T = unknown>(path: string, options: RequestOptions = {}): Promise<T> {
    const url = new URL(`${API_URL}${path}`);
    for (const [k, v] of Object.entries(options.query ?? {})) {
      if (v === undefined || v === null || v === "") continue;
      if (Array.isArray(v)) {
        for (const item of v) url.searchParams.append(k, String(item));
      } else {
        url.searchParams.set(k, String(v));
      }
    }

    const headers: Record<string, string> = { accept: "application/json" };
    let body: string | undefined;
    if (options.body !== undefined && options.body !== null) {
      headers["content-type"] = "application/json";
      body = JSON.stringify(options.body);
    }

    const method = options.method ?? "GET";
    const res = await this.ctx.fetch(url.toString(), { method, headers, body });
    // Read the text once: a Firestore error is a JSON envelope, and an empty
    // success body (delete) is not an error at all.
    const text = await res.text();
    if (!res.ok) {
      throw new Error(
        `Firestore ${method} ${url.pathname} failed — ` +
          describeGoogleError(res.status, res.statusText, text),
      );
    }
    if (!text) return undefined as T;
    return JSON.parse(text) as T;
  }

  /**
   * The three streamed RPCs — `runQuery`, `runAggregationQuery` and `batchGet` —
   * answer over REST as a **JSON array** of their response message, not a single
   * object. Google's own generated clients read the body as a list for exactly
   * these three (the discovery doc's descriptions call them "the streamed
   * response for …"). This normalizes a body that arrives as one object anyway,
   * so a proxy that collapses a single-element stream does not break the action.
   */
  async requestStream<T = unknown>(path: string, options: RequestOptions = {}): Promise<T[]> {
    const body = await this.request<unknown>(path, options);
    if (body === undefined || body === null) return [];
    if (Array.isArray(body)) return body as T[];
    return [body as T];
  }
}

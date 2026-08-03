import type { HookContext, Option } from "@w6w/types";

/**
 * Google **People API** v1 — the API that replaced the retired Google Contacts
 * API v3 (`www.google.com/m8/feeds`, turned down 2022-01-19). Everything in this
 * app talks to this one origin.
 *
 * Reference: https://developers.google.com/people/api/rest
 */
export const PEOPLE_API = "https://people.googleapis.com/v1";

/**
 * `personFields` values accepted by `people.get`, `people.batchGet` and
 * `people.connections.list` (the read masks). Verified against
 * https://developers.google.com/people/api/rest/v1/people/get.
 */
export const PERSON_FIELDS = [
  "addresses",
  "ageRanges",
  "biographies",
  "birthdays",
  "calendarUrls",
  "clientData",
  "coverPhotos",
  "emailAddresses",
  "events",
  "externalIds",
  "genders",
  "imClients",
  "interests",
  "locales",
  "locations",
  "memberships",
  "metadata",
  "miscKeywords",
  "names",
  "nicknames",
  "occupations",
  "organizations",
  "phoneNumbers",
  "photos",
  "relations",
  "sipAddresses",
  "skills",
  "urls",
  "userDefined",
] as const;

/**
 * `updatePersonFields` values accepted by `people.updateContact`. This is a
 * strict subset of {@link PERSON_FIELDS} — the read-only masks (`ageRanges`,
 * `coverPhotos`, `metadata`, `photos`, `skills`) are not writable. Verified
 * against https://developers.google.com/people/api/rest/v1/people/updateContact.
 */
export const UPDATE_PERSON_FIELDS = [
  "addresses",
  "biographies",
  "birthdays",
  "calendarUrls",
  "clientData",
  "emailAddresses",
  "events",
  "externalIds",
  "genders",
  "imClients",
  "interests",
  "locales",
  "locations",
  "memberships",
  "miscKeywords",
  "names",
  "nicknames",
  "occupations",
  "organizations",
  "phoneNumbers",
  "relations",
  "sipAddresses",
  "urls",
  "userDefined",
] as const;

/**
 * `readMask` values `otherContacts.list` returns for the default
 * `READ_SOURCE_TYPE_CONTACT` source. "Other contacts" are auto-collected
 * addresses, so Google exposes far less of them than of a real contact.
 * Verified against
 * https://developers.google.com/people/api/rest/v1/otherContacts/list.
 */
export const OTHER_CONTACT_FIELDS = [
  "emailAddresses",
  "metadata",
  "names",
  "phoneNumbers",
  "photos",
] as const;

/**
 * `groupFields` / `readGroupFields` / `updateGroupFields` values on the
 * `contactGroups` resource. Verified against
 * https://developers.google.com/people/api/rest/v1/contactGroups/list.
 */
export const GROUP_FIELDS = [
  "clientData",
  "groupType",
  "memberCount",
  "metadata",
  "name",
] as const;

/** `updateGroupFields` only accepts the two writable group fields. */
export const UPDATE_GROUP_FIELDS = ["clientData", "name"] as const;

/** `sources[]` (ReadSourceType) values shared by every read method. */
export const READ_SOURCE_TYPES = [
  "READ_SOURCE_TYPE_PROFILE",
  "READ_SOURCE_TYPE_CONTACT",
  "READ_SOURCE_TYPE_DOMAIN_CONTACT",
] as const;

/**
 * The default field mask. `personFields` is **required** on `people.get`,
 * `people.batchGet`, `people.connections.list` and `people.createContact`, and
 * `readMask` is required on `people.searchContacts` and `otherContacts.list` —
 * so every action that needs one carries this as its `default` rather than
 * risking a 400 when a caller omits it.
 */
export const DEFAULT_PERSON_FIELDS = "names,emailAddresses,phoneNumbers";

/** Build `Option[]` for a `multiselect` param from one of the const lists. */
export function fieldOptions(fields: readonly string[]): Option[] {
  return fields.map((f) => ({ value: f, label: f }));
}

export type QueryValue = string | number | boolean | readonly string[] | undefined | null;

export interface RequestOptions {
  method?: string;
  /**
   * Query parameters. An array value is emitted as a **repeated** parameter
   * (`sources=A&sources=B`) — that is how gRPC-transcoded repeated fields are
   * addressed over REST, not as a comma-joined single value.
   */
  query?: Record<string, QueryValue>;
  body?: unknown;
}

/**
 * Thin wrapper over `ctx.fetch`. Auth is injected by the auth `sign` hook —
 * this client never touches `Authorization` directly.
 *
 * Callers pass a path relative to {@link PEOPLE_API} (`/people/me/connections`)
 * or an absolute URL.
 */
export class GoogleContactsClient {
  constructor(private ctx: HookContext) {}

  async request<T = unknown>(path: string, options: RequestOptions = {}): Promise<T> {
    const url = new URL(
      path.startsWith("http") ? path : `${PEOPLE_API}${path.startsWith("/") ? path : `/${path}`}`,
    );
    if (options.query) {
      for (const [k, v] of Object.entries(options.query)) {
        if (v === undefined || v === null || v === "") continue;
        if (Array.isArray(v)) {
          for (const item of v) {
            if (item === undefined || item === null || item === "") continue;
            url.searchParams.append(k, String(item));
          }
        } else {
          url.searchParams.set(k, String(v));
        }
      }
    }

    const init: RequestInit = { method: options.method ?? "GET", headers: {} };
    if (options.body !== undefined) {
      (init.headers as Record<string, string>)["content-type"] = "application/json";
      init.body = JSON.stringify(options.body);
    }

    const res = await this.ctx.fetch(url.toString(), init);
    if (!res.ok) {
      let detail = "";
      try {
        detail = await res.text();
      } catch { /* ignore */ }
      throw new Error(
        `Google People API ${res.status} ${res.statusText} for ${
          options.method ?? "GET"
        } ${url.pathname}: ${detail}`,
      );
    }
    if (res.status === 204) return undefined as T;
    const text = await res.text();
    // `deleteContact` / `contactGroups.delete` answer 200 with an empty body.
    if (!text) return undefined as T;
    return JSON.parse(text) as T;
  }
}

/**
 * Normalise a FieldMask that may arrive as a `multiselect` array, a
 * comma-separated string, or (from a workflow expression) a mix with stray
 * whitespace. Trims, drops empties, de-duplicates while preserving order, and
 * joins with commas — the wire format Google expects.
 *
 * Returns `undefined` when nothing survives, so an optional mask is omitted
 * from the query rather than sent as an empty string.
 */
export function fieldMask(
  input: string | readonly string[] | undefined | null,
): string | undefined {
  if (input === undefined || input === null) return undefined;
  const parts = (Array.isArray(input) ? input : String(input).split(","))
    .flatMap((p) => String(p).split(","))
    .map((p) => p.trim())
    .filter((p) => p.length > 0);
  const seen = new Set<string>();
  const out: string[] = [];
  for (const p of parts) {
    if (seen.has(p)) continue;
    seen.add(p);
    out.push(p);
  }
  return out.length > 0 ? out.join(",") : undefined;
}

/**
 * A **required** FieldMask: same normalisation, but falls back to `fallback`
 * when the caller supplied nothing usable. Used for `personFields` /
 * `readMask`, which Google rejects the request without.
 */
export function requiredFieldMask(
  input: string | readonly string[] | undefined | null,
  fallback: string = DEFAULT_PERSON_FIELDS,
): string {
  return fieldMask(input) ?? fallback;
}

/**
 * A required FieldMask with **no** fallback — `updatePersonFields` has no sane
 * default, because guessing it would silently clear fields the caller never
 * meant to touch.
 */
export function mandatoryFieldMask(
  input: string | readonly string[] | undefined | null,
  paramName: string,
): string {
  const mask = fieldMask(input);
  if (!mask) {
    throw new Error(
      `${paramName} is required — name every field to write, e.g. "names,emailAddresses". ` +
        `Google clears any field named in the mask but absent from the body.`,
    );
  }
  return mask;
}

/** Normalise a repeated string param (array, or comma/newline-separated text). */
export function stringList(input: string | readonly string[] | undefined | null): string[] {
  if (input === undefined || input === null) return [];
  return (Array.isArray(input) ? input : String(input).split(/[\n,]/))
    .flatMap((p) => String(p).split(/[\n,]/))
    .map((p) => p.trim())
    .filter((p) => p.length > 0);
}

/**
 * Coerce a person identifier into the `people/{person_id}` resource name the
 * API expects, accepting a bare id for convenience. **Not** percent-encoded —
 * use this when the value goes into a query parameter (`resourceNames[]`),
 * where `URLSearchParams` does the encoding and pre-encoding would double it.
 */
export function personName(input: string | undefined | null): string {
  return prefixedName(input, "people", "people/c1234567890 or c1234567890");
}

/** As {@link personName}, for the `contactGroups/{id}` resource name. */
export function contactGroupName(input: string | undefined | null): string {
  return prefixedName(input, "contactGroups", "contactGroups/myContacts or myContacts");
}

/**
 * The path form of {@link personName}: the `people/` prefix stays literal and
 * only the id segment is percent-encoded, or the separating slash would be
 * escaped and the route would 404.
 */
export function personResource(input: string | undefined | null): string {
  return encodeResource(personName(input), "people");
}

/** The path form of {@link contactGroupName}. */
export function contactGroupResource(input: string | undefined | null): string {
  return encodeResource(contactGroupName(input), "contactGroups");
}

function prefixedName(input: string | undefined | null, prefix: string, example: string) {
  const raw = (input ?? "").trim();
  const id = raw.startsWith(`${prefix}/`) ? raw.slice(prefix.length + 1).trim() : raw;
  if (!id) throw new Error(`resourceName is required (e.g. \`${example}\`)`);
  return `${prefix}/${id}`;
}

function encodeResource(name: string, prefix: string) {
  return `${prefix}/${encodeURIComponent(name.slice(prefix.length + 1))}`;
}

/**
 * `people.updateContact` refuses to write unless the body carries the etag read
 * with the contact — that is the API's optimistic-concurrency check, and the
 * server answers 400 without it. Failing here gives the caller the real
 * instruction ("read the contact first") instead of Google's opaque error.
 */
export function assertUpdateEtag(person: unknown): void {
  const p = person as
    | { etag?: unknown; metadata?: { sources?: Array<{ etag?: unknown }> } }
    | null
    | undefined;
  if (!p || typeof p !== "object") {
    throw new Error("`person` must be an object — the Person resource to write.");
  }
  const hasTopLevel = typeof p.etag === "string" && p.etag.length > 0;
  const hasSourceEtag = Array.isArray(p.metadata?.sources) &&
    p.metadata.sources.some((s) => typeof s?.etag === "string" && s.etag.length > 0);
  if (!hasTopLevel && !hasSourceEtag) {
    throw new Error(
      "`person` must carry the etag read with the contact — set `person.etag` or " +
        "`person.metadata.sources[].etag`. Read the contact with `get-person` first; " +
        "Google rejects an update without it so a concurrent edit is never clobbered.",
    );
  }
}

import type { HookContext, RedactedConnection } from "@w6w/types";

/**
 * NerdGraph — New Relic's API, verified live against `api.newrelic.com/graphql`
 * and `api.eu.newrelic.com/graphql` on 2026-08-18, with mutation shapes taken
 * from New Relic's own NerdGraph documentation.
 *
 * ## It is GraphQL, and only GraphQL
 *
 * One endpoint, one POST, for everything: querying metrics, searching entities,
 * acknowledging incidents, recording deployments. There is no REST surface to
 * fall back to. That has a consequence worth stating plainly, because it is the
 * defining property of this app.
 *
 * ## Errors arrive in a 200, at three different levels
 *
 * This is the trap, and GraphQL makes it structural rather than accidental.
 *
 * **Level 1 — HTTP.** A rejected key is a real `401`, verified live:
 * `{"errors":[{"message":"authentication required"}]}`. That much behaves
 * normally.
 *
 * **Level 2 — the GraphQL `errors` array.** A query that authenticated but
 * failed — a bad NRQL string, an account the key cannot see, a field that does
 * not exist — comes back **HTTP 200** with `errors` populated. Worse, GraphQL
 * permits *partial success*: `data` and `errors` both present, some fields
 * resolved and others null. A client reading `data` and ignoring `errors` gets
 * a plausible object with holes in it and no indication anything went wrong.
 *
 * **Level 3 — the mutation's own payload.** New Relic's mutations return their
 * own `errors` field inside `data`. So `taggingAddTagsToEntity` can return
 * HTTP 200, with no top-level `errors`, and still have failed — the reason is
 * in `data.taggingAddTagsToEntity.errors`.
 *
 * `gql()` below checks all three. `mutationErrors()` handles the third for
 * callers.
 *
 * ## US and EU are different endpoints and different data
 *
 * An account lives in one region. Querying `api.newrelic.com` with an EU
 * account's key does not return an empty result — it returns
 * `authentication required`, which reads exactly like a wrong key and sends
 * people to rotate a credential that was fine.
 *
 * ## The key type matters and is not obvious
 *
 * NerdGraph wants a **User key** (`NRAK-…`). A **License key** or **Ingest
 * key** is for sending data in, not reading it out, and produces the same
 * `authentication required`. Three different failures with one message.
 */

/** NerdGraph endpoints. An account lives in exactly one of them. */
export const REGIONS = {
  US: "https://api.newrelic.com/graphql",
  EU: "https://api.eu.newrelic.com/graphql",
} as const;

export type Region = keyof typeof REGIONS;

/** Public (redacted-safe) connection metadata. */
export interface NewRelicConnectionDisplay {
  region?: string;
  accountId?: number | string;
  userName?: string;
}

/** Normalise a region field into one of the two endpoints. */
export function endpointFor(region: unknown): string {
  const key = String(region ?? "US").trim().toUpperCase();
  if (key === "EU") return REGIONS.EU;
  if (key === "US") return REGIONS.US;
  throw new Error(`unknown region ${JSON.stringify(region)} — New Relic has US and EU`);
}

/** Read the region off the redacted Connection. */
export function regionFromConnection(connection: RedactedConnection | undefined): Region {
  const display = (connection?.display ?? {}) as NewRelicConnectionDisplay;
  return String(display.region ?? "US").toUpperCase() === "EU" ? "EU" : "US";
}

/**
 * The account id, which almost every query needs and which the key does not
 * carry.
 *
 * A user key can see several accounts; the connection records a default so a
 * workflow does not have to repeat it, and every action can still override.
 */
export function accountFromConnection(
  connection: RedactedConnection | undefined,
): number | undefined {
  const display = (connection?.display ?? {}) as NewRelicConnectionDisplay;
  const id = Number(display.accountId ?? NaN);
  return Number.isFinite(id) && id > 0 ? id : undefined;
}

/** Resolve an account id from an action param, falling back to the connection. */
export function accountId(value: unknown, connection: RedactedConnection | undefined): number {
  const explicit = Number(value ?? NaN);
  if (Number.isFinite(explicit) && explicit > 0) return explicit;
  const fallback = accountFromConnection(connection);
  if (fallback) return fallback;
  throw new Error(
    "`accountId` is required — a New Relic user key can see several accounts, so the id is not " +
      "implied by the credential. Record a default on the connection, or pass one here. " +
      "`account-list` shows which this key can reach",
  );
}

/** Drop keys the caller left unset. */
export function compact(obj: Record<string, unknown>): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(obj)) {
    if (v === undefined || v === null || v === "") continue;
    if (Array.isArray(v) && v.length === 0) continue;
    out[k] = v;
  }
  return out;
}

/**
 * An object with no keys is nothing to send.
 *
 * `compact` drops empty *values*, not empty objects, so a filter built entirely
 * from unset params comes out as `{}` — which GraphQL treats as a filter that
 * matches nothing in some places and everything in others.
 */
export function emptyToUndefined(
  obj: Record<string, unknown>,
): Record<string, unknown> | undefined {
  return Object.keys(obj).length === 0 ? undefined : obj;
}

/** Split a comma-separated form field into a list, or leave it unset. */
export function csv(v: unknown): string[] | undefined {
  if (Array.isArray(v)) {
    const items = v.map((s) => String(s).trim()).filter(Boolean);
    return items.length ? items : undefined;
  }
  if (typeof v !== "string" || !v.trim()) return undefined;
  const items = v.split(",").map((s) => s.trim()).filter(Boolean);
  return items.length ? items : undefined;
}

/** Parse a JSON-typed param, which arrives as either a string or a live value. */
export function json(value: unknown, field: string): unknown {
  if (value === undefined || value === null || value === "") return undefined;
  if (typeof value !== "string") return value;
  try {
    return JSON.parse(value);
  } catch {
    throw new Error(`\`${field}\` is not valid JSON`);
  }
}

/** A GraphQL error as NerdGraph returns it. */
export interface GraphQLError {
  message?: string;
  path?: Array<string | number>;
  extensions?: { errorClass?: string; errorCode?: string };
}

export interface GraphQLResponse<T> {
  data?: T | null;
  errors?: GraphQLError[];
}

/**
 * Turn GraphQL errors into one actionable message.
 *
 * The `path` matters more than usual here: on a partial success it names
 * exactly which field failed while everything around it resolved.
 */
export function describeErrors(errors: GraphQLError[], partial: boolean): string {
  const parts = errors.map((error) => {
    const path = error.path?.length ? ` at ${error.path.join(".")}` : "";
    const code = error.extensions?.errorClass ?? error.extensions?.errorCode;
    return `${error.message ?? "unknown error"}${path}${code ? ` [${code}]` : ""}`;
  });
  const joined = parts.join("; ");

  if (/authentication required/i.test(joined)) {
    return `${joined} — this one message covers three different problems: the key is wrong, the ` +
      "key is a License or Ingest key rather than a User key (`NRAK-…`), or the account is in " +
      "the other region and this connection is pointed at the wrong endpoint";
  }
  if (partial) {
    return `${joined} — NOTE this was a PARTIAL success: some fields resolved and some did not, ` +
      "in an HTTP 200. The data that did come back is incomplete rather than wrong";
  }
  return joined;
}

/**
 * Thin wrapper over `ctx.fetch`. It never sets the key — the runtime routes
 * every request through the auth `sign` hook.
 */
export class NewRelicClient {
  readonly endpoint: string;
  readonly region: Region;

  constructor(private ctx: HookContext) {
    this.region = regionFromConnection(ctx.connection);
    this.endpoint = REGIONS[this.region];
  }

  /** The account id for this call, from the param or the connection. */
  account(value: unknown): number {
    return accountId(value, this.ctx.connection);
  }

  async gql<T>(query: string, variables: Record<string, unknown> = {}): Promise<T> {
    const res = await this.ctx.fetch(this.endpoint, {
      method: "POST",
      headers: { "content-type": "application/json", accept: "application/json" },
      body: JSON.stringify({ query, variables }),
    });
    const text = await res.text().catch(() => "");

    let body: GraphQLResponse<T> | null = null;
    try {
      body = JSON.parse(text) as GraphQLResponse<T>;
    } catch {
      throw new Error(
        `New Relic ${res.status} did not return JSON: ${text.slice(0, 200)}`,
      );
    }

    // Level 1: the HTTP status, which only auth failures actually use.
    if (!res.ok) {
      const detail = body?.errors?.length ? describeErrors(body.errors, false) : text.slice(0, 200);
      throw new Error(`New Relic ${res.status}: ${detail}`);
    }
    // Level 2: the GraphQL errors array, which arrives inside a 200 — including
    // on a partial success, where `data` is populated too.
    if (body?.errors?.length) {
      throw new Error(
        `New Relic: ${describeErrors(body.errors, Boolean(body.data))}`,
      );
    }
    if (!body?.data) throw new Error("New Relic returned neither data nor errors");
    return body.data;
  }
}

/**
 * Level 3: a mutation's own `errors` field.
 *
 * New Relic's mutations report their failures inside `data`, so a call can
 * return HTTP 200 with no GraphQL errors and still not have done anything.
 * Every mutation in this app runs its payload through here.
 */
export function mutationErrors(
  payload: { errors?: Array<{ message?: string; type?: string }> } | null | undefined,
  operation: string,
): void {
  const errors = payload?.errors ?? [];
  if (errors.length === 0) return;
  const detail = errors
    .map((error) => `${error.type ? `${error.type}: ` : ""}${error.message ?? "unknown"}`)
    .join("; ");
  throw new Error(
    `${operation} failed: ${detail}. Note this arrived as an HTTP 200 with no GraphQL errors — ` +
      "New Relic's mutations report their own failures inside `data`",
  );
}

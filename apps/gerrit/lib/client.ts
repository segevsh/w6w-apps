import type { HookContext } from "@w6w/types";

/**
 * Gerrit's REST API — built against a live Gerrit (3.14) at
 * `gerrit-review.googlesource.com` and Gerrit's own documentation, probed on
 * 2026-08-19.
 *
 * ## Every JSON response starts with `)]}'`
 *
 * Verified on every endpoint, including the ones that return a bare string:
 *
 *     GET /config/server/version
 *     )]}'
 *     "3.14.2-622-ge70cefe8a2"
 *
 * It is a deliberate XSSI defence — the five characters make the body invalid
 * JavaScript, so a `<script src>` pointed at a Gerrit endpoint cannot execute
 * it and steal the contents. Gerrit's documentation calls it the magic prefix.
 *
 * The consequence for a client is total: `JSON.parse` fails on **every single
 * response**, and the error is a syntax error at position 0 rather than
 * anything that names Gerrit. `stripMagicPrefix` is the first thing this
 * client does with a body.
 *
 * ## Timestamps are not ISO 8601, and parsing them naively is wrong by hours
 *
 * Gerrit returns `"2026-08-19 04:13:33.000000000"` — a space rather than a
 * `T`, nanosecond precision, and **no timezone**. They are UTC by convention.
 *
 * `Date.parse` on that string treats it as *local* time, so a workflow
 * computing how long a change has been open is wrong by the runtime's offset —
 * silently, and differently depending on where it runs. `parseTimestamp`
 * reads them as UTC explicitly.
 *
 * ## Authenticated requests go under `/a/`, and unauthenticated ones work
 *
 * Gerrit serves anonymous reads at the bare path and authenticated ones at
 * `/a/…`. So an unauthenticated client is not refused — it gets whatever the
 * instance shows the public, which on an open-source Gerrit is a great deal
 * and on a private one is nothing. This client always uses `/a/`, so that a
 * failing credential fails rather than quietly returning less.
 *
 * ## A change has four identifiers, and they are not interchangeable
 *
 * - `_number` — `620421`, unique on this host, what the web UI shows.
 * - `change_id` — `I7fa2d25…`, the Change-Id from the commit message, which is
 *   **not unique**: the same Change-Id exists on every branch a change was
 *   cherry-picked to, and using it alone can return "multiple changes found".
 * - `id` — `project~number`, unique and stable.
 * - `triplet_id` — `project~branch~Change-Id`, unambiguous and unwieldy.
 *
 * The safe one for automation is `_number` or `id`; the tempting one is the
 * Change-Id in the commit message.
 */

/** Gerrit's XSSI guard, prepended to every JSON body. */
export const MAGIC_PREFIX = ")]}'";

/**
 * Remove the magic prefix.
 *
 * Gerrit emits `)]}'` followed by a newline. Both are stripped; a body that
 * does not carry it is returned unchanged, so this stays correct against a
 * proxy that has already removed it.
 */
export function stripMagicPrefix(body: string): string {
  if (!body.startsWith(MAGIC_PREFIX)) return body;
  return body.slice(MAGIC_PREFIX.length).replace(/^\r?\n/, "");
}

/**
 * Parse a Gerrit timestamp as UTC.
 *
 * `"2026-08-19 04:13:33.000000000"` — no timezone, and UTC by convention.
 * Passing it to `Date.parse` reads it as local time.
 */
export function parseTimestamp(value: unknown): Date | undefined {
  const text = String(value ?? "").trim();
  if (!text) return undefined;
  const match = /^(\d{4})-(\d{2})-(\d{2})[ T](\d{2}):(\d{2}):(\d{2})(?:\.(\d+))?/.exec(text);
  if (!match) return undefined;
  const [, y, mo, d, h, mi, s, frac] = match;
  const ms = frac ? Number(frac.slice(0, 3).padEnd(3, "0")) : 0;
  return new Date(Date.UTC(
    Number(y),
    Number(mo) - 1,
    Number(d),
    Number(h),
    Number(mi),
    Number(s),
    ms,
  ));
}

/** How many days ago a Gerrit timestamp was, read as UTC. */
export function daysSince(value: unknown): number | undefined {
  const at = parseTimestamp(value);
  if (!at) return undefined;
  return Math.floor((Date.now() - at.getTime()) / 86_400_000);
}

export type QueryValue = string | number | boolean | undefined | null;

/** Coerce loosely-typed action params into query-string values, dropping empties. */
export function query(obj: Record<string, unknown>): Record<string, QueryValue> {
  const out: Record<string, QueryValue> = {};
  for (const [k, v] of Object.entries(obj)) {
    if (v === undefined || v === null || v === "") continue;
    out[k] = typeof v === "number" || typeof v === "boolean" ? v : String(v);
  }
  return out;
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

/** Normalise a host: add a scheme, drop a trailing slash and any `/a` suffix. */
export function normalizeHost(value: unknown): string {
  const raw = String(value ?? "").trim().replace(/\/+$/, "").replace(/\/a$/, "");
  if (!raw) throw new Error("a Gerrit host is required");
  const withScheme = /^https?:\/\//i.test(raw) ? raw : `https://${raw}`;
  try {
    const url = new URL(withScheme);
    return `${url.protocol}//${url.host}${url.pathname === "/" ? "" : url.pathname}`;
  } catch {
    throw new Error(`\`${raw}\` is not a usable host`);
  }
}

/** Which Gerrit a connection speaks to. */
export function hostFromConnection(connection: unknown): string {
  const display = (connection as { display?: Record<string, unknown> } | undefined)?.display;
  const host = String(display?.host ?? "").trim();
  if (!host) {
    throw new Error(
      "this connection has no Gerrit host recorded — Gerrit is software people run, so there is " +
        "no default. Reconnect to record one",
    );
  }
  return host;
}

/**
 * Validate a change identifier, and prefer the unambiguous forms.
 *
 * A bare Change-Id (`I…`) is accepted by Gerrit and is **not unique** — the
 * same one exists on every branch the change was cherry-picked to, and Gerrit
 * then answers "multiple changes found". A number or a `project~number` is
 * unique on the host.
 */
export function assertChangeId(value: unknown): string {
  const id = String(value ?? "").trim();
  if (!id) throw new Error("`changeId` is required");
  if (/^I[0-9a-f]{40}$/i.test(id)) {
    throw new Error(
      `\`changeId\` is a bare Change-Id (${id.slice(0, 12)}…), which is NOT UNIQUE — the same ` +
        "one exists on every branch the change was cherry-picked to, and Gerrit answers " +
        "'multiple changes found' rather than picking. Use the change NUMBER, or the " +
        "`project~number` form, both of which `change-search` returns",
    );
  }
  return id;
}

/** The standard Gerrit label range, and what each vote is called. */
export const CODE_REVIEW_MEANING: Record<string, string> = {
  "-2": "blocks submission outright — a veto no amount of +2 overrides",
  "-1": "would prefer this were not merged",
  "0": "no score",
  "+1": "looks good, but somebody else must approve",
  "+2": "approved, and sufficient to submit",
};

/** Turn a Gerrit error into something actionable. */
export function describeError(status: number, text: string): string {
  // Gerrit's error bodies are plain text, and 401 is often HTML.
  const detail = /<html/i.test(text) ? "" : stripMagicPrefix(text).trim().slice(0, 300);

  if (status === 401) {
    return `${detail || "unauthorized"} — Gerrit takes an HTTP password (generated in Settings → ` +
      "HTTP Credentials) as BASIC AUTH, and it is not the account's login password. The 401 " +
      "body is usually HTML rather than a message";
  }
  if (status === 403) {
    return `${detail || "forbidden"} — authenticated and not permitted. Gerrit's permissions are ` +
      "per project and per ref, so a user who can read a change may be unable to vote on it, " +
      "and a label may be granted only over certain branches";
  }
  if (status === 404) {
    return `${detail || "not found"} — or not visible to this account. Gerrit does not ` +
      "distinguish them, deliberately: a change in a project you cannot read is absent rather " +
      "than forbidden";
  }
  if (status === 409) {
    return `${detail || "conflict"} — for a submit this usually means the change cannot merge: ` +
      "its submit requirements are unmet, it depends on an unmerged parent, or it conflicts " +
      "with the branch";
  }
  if (status === 412) {
    return `${detail || "precondition failed"} — the change is not in the state this action ` +
      "requires, such as abandoning one that is already abandoned";
  }
  return detail || `HTTP ${status}`;
}

export interface RequestOptions {
  method?: string;
  query?: Record<string, QueryValue>;
  body?: unknown;
  /** A handful of endpoints answer with text rather than JSON. */
  text?: boolean;
}

/**
 * Thin wrapper over `ctx.fetch`. It never sets the credential — the runtime
 * routes every request through the auth `sign` hook.
 */
export class GerritClient {
  private host: string;

  constructor(private ctx: HookContext, host?: string) {
    this.host = host ?? hostFromConnection(ctx.connection);
  }

  async request<T = unknown>(path: string, options: RequestOptions = {}): Promise<T> {
    // Always `/a/`: the bare path serves anonymous reads, so a failing
    // credential would quietly return less rather than fail.
    const url = new URL(`${this.host}/a${path}`);
    for (const [k, v] of Object.entries(options.query ?? {})) {
      if (v === undefined || v === null || v === "") continue;
      url.searchParams.append(k, String(v));
    }

    const headers: Record<string, string> = { accept: "application/json" };
    const init: RequestInit = { method: options.method ?? "GET", headers };
    if (options.body !== undefined) {
      headers["content-type"] = "application/json";
      init.body = JSON.stringify(options.body);
    }

    const res = await this.ctx.fetch(url.toString(), init);
    const raw = await res.text().catch(() => "");

    if (!res.ok) {
      throw new Error(
        `Gerrit ${res.status} for ${init.method} ${url.pathname}: ${
          describeError(res.status, raw)
        }`,
      );
    }

    const text = stripMagicPrefix(raw);
    if (res.status === 204 || !text.trim()) return undefined as T;
    if (options.text) return text as T;
    try {
      return JSON.parse(text) as T;
    } catch {
      throw new Error(
        `Gerrit did not return JSON: ${text.slice(0, 160)}. Note every Gerrit body begins with ` +
          "the magic prefix `)]}'`, which this client strips",
      );
    }
  }
}

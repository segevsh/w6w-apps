import type { HookContext, RedactedConnection } from "@w6w/types";

/**
 * Home Assistant's REST API — verified against the official developer
 * documentation (`developers.home-assistant.io/docs/api/rest/`, read
 * 2026-08-18).
 *
 * ## The instance is yours, and that has consequences this app cannot fix
 *
 * Home Assistant is software somebody runs, usually on a Raspberry Pi in their
 * house, usually on a **private network**. A workflow runner in a datacentre
 * cannot reach `http://homeassistant.local:8123` any more than it can reach
 * your printer. Making this connection work means one of: Nabu Casa Cloud's
 * Remote UI, a reverse proxy or tunnel with a public hostname, or a runner on
 * the same network. The connection test says so in those words rather than
 * reporting a timeout.
 *
 * If there *is* a reverse proxy, Home Assistant needs `trusted_proxies`
 * configured for it or it rejects the forwarded request with a 400 — a failure
 * that looks like a bad token and is not.
 *
 * ## Setting a state is not controlling a device
 *
 * This is the trap that matters most, and it is stated plainly in Home
 * Assistant's own docs for `POST /api/states/<entity_id>`:
 *
 * > This endpoint sets the representation of a device within Home Assistant and
 * > will not communicate with the actual device.
 *
 * So writing `"on"` to `light.kitchen` makes the dashboard show the light on
 * while the light stays off, until the next poll of the real device silently
 * overwrites it. Turning a light on means **calling a service**
 * (`light.turn_on`), which is a different endpoint. `state-set` exists because
 * it is genuinely useful for entities that have no device behind them — values
 * pushed in from outside — and it says all of this in its own description.
 *
 * ## An entity id is not a device
 *
 * `light.kitchen` is an entity: one controllable or readable thing. A physical
 * device usually provides several — a smart bulb is a light, and often also a
 * `sensor` for its power draw and an `update` entity for its firmware. The REST
 * API addresses entities only; devices exist in the config-entry world, which
 * this API does not expose.
 */

/** What may be sent as a query-string value. */
export type QueryValue = string | number | boolean | undefined | null;

/** Public (redacted-safe) connection metadata. */
export interface HomeAssistantConnectionDisplay {
  url?: string;
  version?: string;
  locationName?: string;
}

/**
 * Normalise a user-typed instance URL.
 *
 * The port is kept because Home Assistant's default is **8123** and almost
 * nobody moves it — but a URL with no port is left alone rather than having
 * 8123 forced onto it, because a tunnelled or reverse-proxied instance is
 * reached on 443 and guessing would break exactly those.
 */
export function normalizeUrl(raw: unknown): string {
  const trimmed = String(raw ?? "").trim().replace(/\/+$/, "");
  if (!trimmed) throw new Error("a Home Assistant URL is required");
  const withScheme = /^https?:\/\//i.test(trimmed) ? trimmed : `http://${trimmed}`;
  let url: URL;
  try {
    url = new URL(withScheme);
  } catch {
    throw new Error(`the Home Assistant URL is not a valid URL: ${trimmed}`);
  }
  if (!url.hostname) throw new Error(`the Home Assistant URL has no host: ${trimmed}`);
  const port = url.port ? `:${url.port}` : "";
  // A path prefix is real: some reverse proxies mount HA under a sub-path.
  const path = url.pathname.replace(/\/+$/, "");
  return `${url.protocol}//${url.hostname}${port}${path}`;
}

/** Read the instance origin off the redacted Connection. */
export function urlFromConnection(connection: RedactedConnection | undefined): string {
  const display = (connection?.display ?? {}) as HomeAssistantConnectionDisplay;
  const url = String(display.url ?? "").trim();
  if (!url) {
    throw new Error(
      "this connection has no Home Assistant URL recorded — reconnect it so the app knows which " +
        "instance to reach",
    );
  }
  return normalizeUrl(url);
}

/** Coerce loosely-typed action params into query-string values, dropping empties. */
export function query(obj: Record<string, unknown>): Record<string, QueryValue> {
  const out: Record<string, QueryValue> = {};
  for (const [k, v] of Object.entries(obj)) {
    if (v === undefined || v === null || v === "") continue;
    out[k] = typeof v === "number" || typeof v === "boolean" ? v : String(v);
  }
  return out;
}

/** Drop keys the caller left unset, so a default is not overwritten with nothing. */
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

/**
 * An entity id is `domain.object_id`, lower case, and Home Assistant is strict
 * about it.
 *
 * Checking here rather than letting the request 404 matters because the
 * mistake people make is passing the **friendly name** — "Kitchen Light"
 * instead of `light.kitchen` — and a 404 does not suggest that at all.
 */
export function entityId(value: unknown, field: string): string {
  const text = String(value ?? "").trim();
  if (!text) throw new Error(`\`${field}\` is required`);
  if (!/^[a-z0-9_]+\.[a-z0-9_]+$/.test(text)) {
    throw new Error(
      `\`${field}\` must be an entity id like \`light.kitchen\` — lower case, ` +
        `\`domain.object_id\`. Got ${JSON.stringify(text)}, which looks like a friendly name; ` +
        "the entity id is in Home Assistant under Settings → Devices & services → Entities",
    );
  }
  return text;
}

/** The domain half of an entity id, which is also a service domain. */
export function domainOf(entity: string): string {
  return entity.split(".")[0];
}

/**
 * Turn a Home Assistant error into something actionable.
 *
 * The bodies are usually `{"message": "..."}`, and the status codes carry more
 * meaning than the text: 401 is the token, 400 behind a proxy is usually
 * `trusted_proxies`, and 404 on a state is a wrong entity id.
 */
export function describeError(status: number, text: string): string {
  let detail = text.slice(0, 300);
  try {
    const body = JSON.parse(text) as { message?: string };
    if (body?.message) detail = body.message;
  } catch { /* plain text, which several endpoints return */ }

  if (status === 401) {
    return `${detail || "unauthorized"} — the long-lived access token was rejected. Tokens do ` +
      "not expire but they are revocable, and deleting the user who created one revokes it";
  }
  if (status === 403) {
    return `${detail || "forbidden"} — the token is valid but not allowed to do this`;
  }
  if (status === 400) {
    return `${detail || "bad request"} — if Home Assistant is behind a reverse proxy, this is ` +
      "usually `trusted_proxies` not listing it in configuration.yaml, which fails in a way that " +
      "looks like a bad request rather than a networking problem";
  }
  if (status === 404) {
    return `${detail || "not found"} — check the entity id. It is \`domain.object_id\` and lower ` +
      "case, not the friendly name shown in the dashboard";
  }
  if (status === 405) {
    return `${detail || "method not allowed"} — the API may be disabled: the \`api\` integration ` +
      "must be loaded, which `default_config` normally does";
  }
  return detail || `HTTP ${status}`;
}

export interface RequestOptions {
  method?: string;
  query?: Record<string, QueryValue>;
  body?: unknown;
  /** Several endpoints answer with plain text rather than JSON. */
  text?: boolean;
}

/**
 * Thin wrapper over `ctx.fetch`. It never sets the token — the runtime routes
 * every request through the auth `sign` hook.
 */
export class HomeAssistantClient {
  readonly base: string;

  constructor(private ctx: HookContext) {
    this.base = urlFromConnection(ctx.connection);
  }

  async request<T = unknown>(path: string, options: RequestOptions = {}): Promise<T> {
    const url = new URL(`${this.base}/api${path}`);
    for (const [k, v] of Object.entries(options.query ?? {})) {
      if (v === undefined || v === null || v === "") continue;
      url.searchParams.set(k, String(v));
    }

    const headers: Record<string, string> = {
      accept: options.text ? "text/plain" : "application/json",
    };
    const init: RequestInit = { method: options.method ?? "GET", headers };
    if (options.body !== undefined) {
      headers["content-type"] = "application/json";
      init.body = JSON.stringify(options.body);
    }

    const res = await this.ctx.fetch(url.toString(), init);
    const text = await res.text().catch(() => "");
    if (!res.ok) {
      throw new Error(
        `Home Assistant ${res.status} for ${init.method} ${url.pathname}: ${
          describeError(res.status, text)
        }`,
      );
    }
    if (res.status === 204 || !text) return undefined as T;
    if (options.text) return text as T;
    try {
      return JSON.parse(text) as T;
    } catch {
      throw new Error(`Home Assistant did not return JSON: ${text.slice(0, 160)}`);
    }
  }
}

/** A Home Assistant state object, as every endpoint returns it. */
export interface EntityState {
  entity_id?: string;
  state?: string;
  attributes?: Record<string, unknown>;
  last_changed?: string;
  last_updated?: string;
}

/**
 * The two states that mean "this is not working", which Home Assistant returns
 * as ordinary state strings rather than as errors.
 *
 * `unavailable` — the integration cannot reach the device right now.
 * `unknown` — the entity exists but has never reported a value.
 *
 * A workflow reading `sensor.boiler_temperature` and getting `"unavailable"`
 * will happily parse it as a number and get `NaN`, so distinguishing them is
 * worth doing once, here.
 */
export const NOT_WORKING = new Set(["unavailable", "unknown"]);

/** Whether a state string is one of the two "not working" values. */
export function isUsable(state: unknown): boolean {
  return !NOT_WORKING.has(String(state ?? ""));
}

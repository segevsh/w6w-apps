import type { HookContext, RedactedConnection } from "@w6w/types";

/**
 * 1Password's two server-side APIs — probed live on 2026-08-18.
 *
 * ## This app reads secrets, so start there
 *
 * A connection to 1Password Connect can read every credential in the vaults its
 * token is scoped to. That is the point of it, and it is why this app is built
 * the way it is:
 *
 * - **`item-get` redacts secret field values by default.** It returns the
 *   item's structure — which fields exist, their labels, their types — with the
 *   values of concealed fields replaced. Reading a value is a separate,
 *   deliberate act: either `revealSecrets` on `item-get`, or `item-field-get`,
 *   which fetches exactly one named field and nothing else.
 * - **No action logs a field value, ever.** The `index.ts` suite walks every
 *   action's source and asserts it.
 * - **The Connect token is not an account credential.** It is scoped to
 *   specific vaults at issue time and cannot reach anything else, which is the
 *   property that makes this safe to automate at all.
 *
 * ## Two APIs, two credentials, two surfaces
 *
 * They do not overlap, and a connection is one or the other:
 *
 * | | Connect | Events |
 * | --- | --- | --- |
 * | Host | **yours** — a container you run | `events.1password.com` and three regional siblings |
 * | Credential | a Connect token, scoped to vaults | an Events Reporting token, scoped to event kinds |
 * | Reads | vault items, including secrets | the audit trail — who did what, and who read which item |
 * | Writes | items | nothing |
 *
 * There is no per-action auth binding in this runtime, so an action needing
 * Connect on an Events connection would otherwise fail somewhere deep with a
 * 404. `requireConnect()` and `requireEvents()` catch it up front and say which
 * kind of connection the action needs.
 *
 * ## Connect is self-hosted, which has the usual consequence
 *
 * The Connect server is a container running on your own infrastructure, often
 * inside a private network. A workflow runner elsewhere cannot reach it, and
 * that is a deployment question rather than a credential one — the connection
 * test says so specifically instead of reporting a timeout.
 */

/** Events API hosts. An account lives in exactly one. */
export const EVENTS_HOSTS = {
  global: "https://events.1password.com",
  eu: "https://events.1password.eu",
  ca: "https://events.1password.ca",
  enterprise: "https://events.ent.1password.com",
} as const;

export type EventsRegion = keyof typeof EVENTS_HOSTS;

/** Which API a connection points at. */
export type Surface = "connect" | "events";

/** Public (redacted-safe) connection metadata. */
export interface OnePasswordConnectionDisplay {
  surface?: string;
  /** Connect only: the server's own URL. */
  url?: string;
  /** Events only. */
  region?: string;
  /** Connect only, from the token's own scope. */
  vaultCount?: number;
}

/** Normalise an Events region field. */
export function eventsHostFor(region: unknown): string {
  const key = String(region ?? "global").trim().toLowerCase() as EventsRegion;
  const host = EVENTS_HOSTS[key];
  if (!host) {
    throw new Error(
      `unknown Events region ${JSON.stringify(region)} — 1Password has ${
        Object.keys(EVENTS_HOSTS).join(", ")
      }`,
    );
  }
  return host;
}

/** Normalise a user-typed Connect server URL into an origin. */
export function normalizeUrl(raw: unknown): string {
  const trimmed = String(raw ?? "").trim().replace(/\/+$/, "");
  if (!trimmed) throw new Error("a Connect server URL is required");
  const withScheme = /^https?:\/\//i.test(trimmed) ? trimmed : `http://${trimmed}`;
  let url: URL;
  try {
    url = new URL(withScheme);
  } catch {
    throw new Error(`the Connect server URL is not a valid URL: ${trimmed}`);
  }
  if (!url.hostname) throw new Error(`the Connect server URL has no host: ${trimmed}`);
  const port = url.port ? `:${url.port}` : "";
  return `${url.protocol}//${url.hostname}${port}${url.pathname.replace(/\/+$/, "")}`;
}

/** Which surface a connection is for. */
export function surfaceOf(connection: RedactedConnection | undefined): Surface {
  const display = (connection?.display ?? {}) as OnePasswordConnectionDisplay;
  return display.surface === "events" ? "events" : "connect";
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
 * The field types 1Password conceals in its own UI.
 *
 * `CONCEALED` is the explicit one — passwords, tokens, keys. The others hold
 * values that are secret in practice whatever their type says, and treating
 * them as ordinary text is how a TOTP seed or a private key ends up in a log.
 */
export const SECRET_FIELD_TYPES = new Set(["CONCEALED", "OTP", "SSHKEY", "CREDIT_CARD_NUMBER"]);

/** A field on a 1Password item. */
export interface ItemField {
  id?: string;
  label?: string;
  type?: string;
  purpose?: string;
  value?: string;
  totp?: string;
}

/** Whether a field's value should be withheld unless explicitly asked for. */
export function isSecretField(field: ItemField): boolean {
  if (SECRET_FIELD_TYPES.has(String(field?.type ?? ""))) return true;
  // `purpose: PASSWORD` marks the primary password whatever its declared type.
  return String(field?.purpose ?? "") === "PASSWORD";
}

/**
 * Replace secret values with a marker, keeping everything that describes the
 * item's shape.
 *
 * The structure is what a workflow usually needs — which fields exist, what
 * they are called, whether a password is set at all — and it carries no risk.
 * The values are a separate question with a separate answer.
 */
export function redactFields(fields: ItemField[]): ItemField[] {
  return fields.map((field) => {
    if (!isSecretField(field)) return field;
    const { value: _value, totp: _totp, ...rest } = field;
    return {
      ...rest,
      // A boolean, so "is a password set" stays answerable without the value.
      value: field.value ? "[redacted]" : undefined,
    };
  });
}

/** Turn a 1Password error into something actionable. */
export function describeError(status: number, text: string, surface: Surface): string {
  let detail = text.slice(0, 300);
  try {
    const body = JSON.parse(text) as
      | { message?: string; Error?: { Message?: string } }
      | undefined;
    detail = body?.message ?? body?.Error?.Message ?? detail;
  } catch { /* not JSON */ }

  if (status === 401) {
    return surface === "connect"
      ? `${detail} — the Connect token was rejected. Tokens are issued per Connect server and ` +
        "cannot be moved between them, and they expire if one was issued with a lifetime"
      : `${detail} — the Events token was rejected. Check the region: an account in the EU or ` +
        "Canada is a different host, and the wrong one fails exactly like a bad token";
  }
  if (status === 403) {
    return surface === "connect"
      ? `${detail} — the token is valid but not scoped to this vault. Connect tokens name their ` +
        "vaults at issue time and cannot be widened afterwards; a new token is the only way"
      : `${detail} — the Events token is valid but not scoped to this event kind. Sign-in ` +
        "attempts, item usages and audit events are granted separately";
  }
  if (status === 404 && surface === "connect") {
    return `${detail} — not found, which for Connect also happens when the token is not scoped ` +
      "to the vault: an invisible vault and a missing one look identical, on purpose";
  }
  return detail || `HTTP ${status}`;
}

export interface RequestOptions {
  method?: string;
  query?: Record<string, string | number | boolean | undefined>;
  body?: unknown;
}

/**
 * Thin wrapper over `ctx.fetch`. It never sets a token — the runtime routes
 * every request through the auth `sign` hook.
 */
export class OnePasswordClient {
  readonly surface: Surface;

  constructor(private ctx: HookContext) {
    this.surface = surfaceOf(ctx.connection);
  }

  /**
   * The Connect server's base URL, and a clear refusal when this connection is
   * for the Events API instead.
   */
  requireConnect(action: string): string {
    if (this.surface !== "connect") {
      throw new Error(
        `\`${action}\` needs a **Connect** connection, and this one is for the Events API. They ` +
          "are separate credentials reaching separate services: Connect reads vault items from a " +
          "server you run, Events reads the account's audit trail. Connect a Connect token to " +
          "use this action",
      );
    }
    const display = (this.ctx.connection?.display ?? {}) as OnePasswordConnectionDisplay;
    const url = String(display.url ?? "").trim();
    if (!url) {
      throw new Error(
        "this connection has no Connect server URL recorded — reconnect it so the app knows " +
          "which server to reach",
      );
    }
    return normalizeUrl(url);
  }

  /** The Events host, and a clear refusal on a Connect connection. */
  requireEvents(action: string): string {
    if (this.surface !== "events") {
      throw new Error(
        `\`${action}\` needs an **Events** connection, and this one is for a Connect server. ` +
          "Events Reporting is a separate integration in the 1Password account, with its own " +
          "token — see the app README",
      );
    }
    const display = (this.ctx.connection?.display ?? {}) as OnePasswordConnectionDisplay;
    return eventsHostFor(display.region);
  }

  async request<T = unknown>(base: string, path: string, options: RequestOptions = {}): Promise<T> {
    const url = new URL(`${base}${path}`);
    for (const [k, v] of Object.entries(options.query ?? {})) {
      if (v === undefined || v === null || v === "") continue;
      url.searchParams.set(k, String(v));
    }

    const headers: Record<string, string> = { accept: "application/json" };
    const init: RequestInit = { method: options.method ?? "GET", headers };
    if (options.body !== undefined) {
      headers["content-type"] = "application/json";
      init.body = JSON.stringify(options.body);
    }

    const res = await this.ctx.fetch(url.toString(), init);
    const text = await res.text().catch(() => "");
    if (!res.ok) {
      throw new Error(
        `1Password ${res.status} for ${init.method} ${url.pathname}: ${
          describeError(res.status, text, this.surface)
        }`,
      );
    }
    if (res.status === 204 || !text) return undefined as T;
    try {
      return JSON.parse(text) as T;
    } catch {
      throw new Error(`1Password did not return JSON: ${text.slice(0, 160)}`);
    }
  }
}

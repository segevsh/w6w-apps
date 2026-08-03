/**
 * Shared HTTP client for the **Manychat Public API**.
 *
 * ## Where the contract actually came from
 *
 * The integration catalogue pointed at `https://api.manychat.com/swagger`, and for
 * once the link is right — but that page is a 2.2 KB HTML shell that boots
 * Swagger UI in the browser and nothing else. The machine-readable spec it loads
 * is at a URL the page only names in JavaScript:
 *
 *     GET https://api.manychat.com/swagger/compileJson?type=Page_API      (39 KB)
 *     GET https://api.manychat.com/swagger/compileJson?type=Profile_API   (2.8 KB)
 *
 * Both were fetched on 2026-08-03 and returned `application/json` OpenAPI 3.0.0
 * documents. **Every path, parameter name, body field and response shape in this
 * app was transcribed from those two documents**, not from a rendered page and
 * not from memory. Where a fact is not in them it is called out as such, both
 * here and in README.md.
 *
 * ## Base URL
 *
 * The spec declares `"servers": [{ "url": "" }]` — i.e. it does not state one, so
 * the host had to be confirmed elsewhere. Two independent confirmations:
 *
 *   - Manychat's own PHP client (`github.com/manychat/manychat-api-php`,
 *     `src/API/BaseAPI.php`) hardcodes
 *     `public const API_URL = 'https://api.manychat.com';`
 *   - On the wire, 2026-08-03:
 *
 *         $ curl -sSi https://api.manychat.com/fb/page/getInfo
 *         HTTP/2 401
 *         content-type: application/json; charset=UTF-8
 *         {"status":"error","message":"Token is required"}
 *
 *     A path that did not exist would 404 into Manychat's 38 KB HTML error page
 *     (that is what `/swagger.json` does); this one reaches the API and asks for
 *     a token.
 *
 * ## The `/fb/` prefix is not a Facebook-only prefix
 *
 * Every Page API path begins `/fb/`, which reads like a Messenger-only namespace.
 * It is not: it is a fossil from when Manychat was Messenger-only. The
 * `Subscriber` schema in the same document carries `ig_username`, `ig_id`,
 * `whatsapp_phone`, `whatsapp_bsuid`, `whatsapp_username` and `optin_whatsapp`
 * alongside the Messenger fields, and `createSubscriber` accepts
 * `whatsapp_phone` as an identity. There is no `/ig/` or `/wa/` namespace to
 * look for — `/fb/` is the whole Page API.
 *
 * ## Auth
 *
 * `Authorization: Bearer <token>`, per the spec's single security scheme
 * (`{"type":"http","scheme":"bearer"}`). No header is set here — the auth `sign`
 * hook is the only place in this app that touches the credential.
 *
 * ## Response envelope
 *
 * Every documented response is `{ "status": "success", "data"?: ... }` or
 * `{ "status": "error", "message": ..., "details"?: ... }`. Note the second
 * arm is a *body* shape, not a status-code shape: this client therefore treats a
 * `200` carrying `status: "error"` as a failure, because a transport-level 200
 * is not evidence the call worked.
 */
import type { HookContext } from "@w6w/types";

export const API_URL = "https://api.manychat.com";

/** `{ status, data }` — the shape of every documented Manychat response. */
export interface ManychatEnvelope<T = unknown> {
  status?: string;
  data?: T;
}

/**
 * Manychat's error body. Two variants are documented — `Response Error`
 * (`status`, `message`, `details.messages[]`) and `Response Error With Code`
 * (`status`, `message`, `code`) — and the wire shows a third, barer one
 * (`{"status":"error","message":"Token is required"}` on a 401, with neither
 * `details` nor `code`). Everything below `status` is therefore optional.
 */
export interface ManychatErrorBody {
  status?: string;
  message?: string;
  code?: number;
  details?: { messages?: Array<{ message?: string }> };
}

/**
 * Render a vendor error for a human. Never echoes the request, the query string
 * or any header — an error message is a place credentials leak by accident.
 */
export function formatError(status: number, body: ManychatErrorBody | undefined): string {
  if (!body) return `HTTP ${status}`;
  const detail = (body.details?.messages ?? [])
    .map((m) => m.message)
    .filter((m): m is string => !!m)
    .join("; ");
  const parts = [body.message, detail || undefined].filter((p): p is string => !!p);
  const code = body.code !== undefined ? ` (code ${body.code})` : "";
  return parts.length ? `HTTP ${status}${code}: ${parts.join(" — ")}` : `HTTP ${status}${code}`;
}

export interface RequestOptions {
  method?: string;
  query?: Record<string, string | number | boolean | undefined | null>;
  body?: unknown;
}

/**
 * Thin wrapper over `ctx.fetch`.
 *
 * Deliberately sets no `Authorization` header: the runtime routes every request
 * through the auth `sign` hook, and that hook is the only code in this app that
 * sees the token.
 */
export class ManychatClient {
  constructor(private ctx: HookContext) {}

  async request<T = unknown>(path: string, options: RequestOptions = {}): Promise<T> {
    const url = new URL(`${API_URL}${path}`);
    if (options.query) {
      for (const [k, v] of Object.entries(options.query)) {
        if (v === undefined || v === null || v === "") continue;
        url.searchParams.set(k, String(v));
      }
    }

    const method = options.method ?? "GET";
    const headers: Record<string, string> = { accept: "application/json" };
    const init: RequestInit = { method, headers };
    if (options.body !== undefined) {
      headers["content-type"] = "application/json";
      init.body = JSON.stringify(options.body);
    }

    const res = await this.ctx.fetch(url.toString(), init);
    const text = await res.text();

    let parsed: ManychatErrorBody | undefined;
    if (text) {
      try {
        parsed = JSON.parse(text) as ManychatErrorBody;
      } catch {
        // Manychat answers an unknown path with a 38 KB HTML error page rather
        // than JSON, so a non-JSON body is a real possibility on failure.
        parsed = undefined;
      }
    }

    // Two failure arms, because Manychat has two. A non-2xx is obvious; a 200
    // whose envelope says `status: "error"` is the one that silently succeeds if
    // you only look at `res.ok`.
    if (!res.ok || parsed?.status === "error") {
      throw new Error(
        `Manychat ${method} ${url.pathname} returned ${formatError(res.status, parsed)}`,
      );
    }

    if (!text) return undefined as T;
    return parsed as T;
  }

  get<T = unknown>(path: string, query?: RequestOptions["query"]): Promise<T> {
    return this.request<T>(path, { query });
  }

  post<T = unknown>(path: string, body: unknown): Promise<T> {
    return this.request<T>(path, { method: "POST", body });
  }
}

/** Drop keys the caller left unset so an optional never overwrites a vendor default. */
export function compact<T extends Record<string, unknown>>(obj: T): Partial<T> {
  const out: Partial<T> = {};
  for (const [key, value] of Object.entries(obj)) {
    if (value === undefined || value === null || value === "") continue;
    out[key as keyof T] = value as T[keyof T];
  }
  return out;
}

/**
 * Manychat's field/bot-field/custom-field values are typed `text`, `number`,
 * `date`, `datetime` or `boolean`, and the write endpoints take a single
 * `field_value` documented as "string, integer or boolean" with the examples
 * `'string'`, `123`, `true`, `'2018-07-18'`, `'2018-07-02T00:00:00+00:00'`.
 *
 * A workflow's form input arrives as a string, so `"true"` and `"42"` would be
 * sent as strings and quietly stored in the wrong type. This coerces the two
 * unambiguous cases and leaves everything else alone — dates stay strings,
 * because that is exactly what the vendor's own examples show.
 */
export function coerceFieldValue(value: unknown): unknown {
  if (typeof value !== "string") return value;
  if (value === "true") return true;
  if (value === "false") return false;
  // Only a canonical number round-trips; "007", "1e5" and " 1" are left as text
  // so a leading-zero reference code is never silently turned into an integer.
  if (/^-?(0|[1-9]\d*)(\.\d+)?$/.test(value)) return Number(value);
  return value;
}

/** The `Tag` schema: `{ id, name }`. */
export interface ManychatTag {
  id?: number;
  name?: string;
}

/** The `Custom Field` schema — a *definition*, without a value. */
export interface ManychatCustomField {
  id?: number;
  name?: string;
  type?: "text" | "number" | "date" | "datetime" | "boolean";
  description?: string;
}

/** The `Bot Field` / `Subscriber Custom Field` schema — a definition *with* a value. */
export interface ManychatValuedField extends ManychatCustomField {
  value?: unknown;
}

/** The `Page` schema, as returned by `/fb/page/getInfo`. */
export interface ManychatPage {
  id?: number;
  name?: string;
  category?: string;
  avatar_link?: string;
  username?: string;
  about?: string;
  description?: string;
  is_pro?: boolean;
  timezone?: string;
}

/**
 * The `Subscriber` schema. Note `id` and `page_id` are **strings**, while
 * `subscriber_id` in every request body is documented as an **integer** — the
 * ids exceed 2^53 in practice, so they are carried as strings on the way out and
 * passed through verbatim on the way in rather than being parsed to a `number`.
 */
export interface ManychatSubscriber {
  id?: string;
  page_id?: string;
  first_name?: string;
  last_name?: string;
  name?: string;
  gender?: string;
  profile_pic?: string;
  locale?: string;
  language?: string;
  timezone?: string;
  live_chat_url?: string;
  last_input_text?: string;
  optin_phone?: boolean;
  phone?: string;
  optin_email?: boolean;
  email?: string;
  subscribed?: string;
  last_interaction?: string | null;
  last_seen?: string;
  is_followup_enabled?: boolean;
  ig_username?: string;
  ig_id?: number;
  whatsapp_phone?: string;
  whatsapp_bsuid?: string | null;
  whatsapp_username?: string | null;
  optin_whatsapp?: boolean;
  custom_fields?: ManychatValuedField[];
  tags?: ManychatTag[];
  user_refs?: Array<{ user_ref?: string; opted_in?: string }>;
}

/** The `Flow` schema. `ns` ("automation namespace") is the id `sendFlow` wants. */
export interface ManychatFlow {
  ns?: string;
  name?: string;
  folder_id?: number;
}

/** The `Folder` schema returned alongside flows by `/fb/page/getFlows`. */
export interface ManychatFolder {
  id?: number;
  name?: string;
  parent_id?: number;
}

/** The `Growth Tools` schema. */
export interface ManychatGrowthTool {
  id?: number;
  name?: string;
  type?: string;
}

/** The `Otn Topic` schema — a One-Time Notification topic. */
export interface ManychatOtnTopic {
  id?: number;
  name?: string;
  description?: string;
}

/**
 * The five field types Manychat accepts, as a reusable `select` option list.
 * Enumerated identically on `Custom Field`, `Bot Field` and
 * `Subscriber Custom Field` in the spec.
 */
export const FIELD_TYPE_OPTIONS = [
  { value: "text", label: "Text" },
  { value: "number", label: "Number" },
  { value: "date", label: "Date (YYYY-MM-DD)" },
  { value: "datetime", label: "Date & time (ISO 8601)" },
  { value: "boolean", label: "Boolean" },
];

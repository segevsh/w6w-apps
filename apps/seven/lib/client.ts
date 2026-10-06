import type { HookContext } from "@w6w/types";

/**
 * seven gateway client — `https://gateway.seven.io/api`.
 *
 * Verified 2026-10-06 against docs.seven.io/en/rest-api/* (the docs publish no OpenAPI document,
 * so every path, verb and field below was read off the endpoint pages) and live probes of the
 * gateway. The reference marks only `GET /api/status` and the legacy `GET /api/sms` deprecated;
 * neither is called.
 *
 * - **Errors live in the BODY, never the status.** Every probe, signed with a junk key or not,
 *   answers HTTP 200. A refused credential is the bare code `900` (JSON `"900"` with
 *   `Accept: application/json`, plain `900` without). Other bodies carry a numeric `success` /
 *   `code` (`500` no credit, `202` bad number, `902` missing scope), or `success: false` plus
 *   `error` / `error_message`. {@link interpret} turns all of those into thrown errors.
 * - **`Accept: application/json` is always sent**, because without it `GET /balance` answers a
 *   bare float as text/plain.
 * - **Bodies**: writes are `application/x-www-form-urlencoded` (every docs example uses `-d`);
 *   `DELETE /sms` is the one JSON body.
 *
 * Nothing here sets a credential header: `ctx.fetch` routes through the Auth `sign` hook.
 */

export const API_BASE = "https://gateway.seven.io";
export const API_PREFIX = "/api";

/** Return codes the docs list, plus the auth family (900-903). */
export const CODE_MEANINGS: Record<string, string> = {
  "100": "accepted",
  "101": "sending to at least one recipient failed",
  "201": "sender invalid (max 11 alphanumeric or 16 numeric characters)",
  "202": "the recipient number is invalid",
  "301": "parameter `to` is not set",
  "305": "parameter `text` is invalid",
  "308": "an unknown or unsupported parameter was sent",
  "401": "text is too long",
  "402": "the same SMS was already sent within the last 180 seconds",
  "403": "daily limit for this recipient number reached",
  "500": "the account has too little credit",
  "600": "an error occurred during sending, or the lookup returned no result",
  "603": "performance tracking needs a custom domain (Settings > Conversion Tracking)",
  "802": "the label is invalid",
  "900": "authentication failed — check the API key",
  "901": "verification of the signing hash failed",
  "902": "the API key has no access rights to this endpoint",
  "903": "the request IP is not on the key's allow-list",
};

export type FormValue = string | number | boolean | undefined | null | Array<string | number>;
export type Query = Record<string, FormValue>;

export interface RequestOptions {
  query?: Query;
  /** Sent as `application/x-www-form-urlencoded`. */
  form?: Record<string, FormValue>;
  /** Sent as `application/json` (only `DELETE /sms` needs it). */
  json?: unknown;
}

/** Percent-encode one path segment. */
export function encodeId(id: string | number): string {
  return encodeURIComponent(String(id ?? "").trim());
}

/** Accept a list however the form handed it over: a real array or a comma-separated string. */
export function toList(value: unknown): string[] {
  if (value === undefined || value === null || value === "") return [];
  return (Array.isArray(value) ? value : String(value).split(","))
    .map((s) => String(s).trim())
    .filter(Boolean);
}

/** Accept a JSON object as an object or as the JSON text a form field produces. */
export function jsonObject(value: unknown): Record<string, FormValue> {
  if (value === undefined || value === null || value === "") return {};
  let v = value;
  if (typeof v === "string") {
    try {
      v = JSON.parse(v);
    } catch {
      throw new Error("seven: a JSON object parameter was not valid JSON");
    }
  }
  if (!v || typeof v !== "object" || Array.isArray(v)) {
    throw new Error("seven: a JSON object parameter must be an object");
  }
  return v as Record<string, FormValue>;
}

function encodeValue(value: Exclude<FormValue, undefined | null>): string {
  if (typeof value === "boolean") return value ? "1" : "0";
  if (Array.isArray(value)) return value.join(",");
  return String(value);
}

/** Build `?a=1&b=2`, skipping unset, null and empty values. `false` and `0` survive. */
export function buildQuery(query: Query | undefined): string {
  const text = toParams(query).toString();
  return text ? `?${text}` : "";
}

export function toParams(values: Record<string, FormValue> | undefined): URLSearchParams {
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(values ?? {})) {
    if (value === undefined || value === null || value === "") continue;
    if (Array.isArray(value) && value.length === 0) continue;
    params.set(key, encodeValue(value));
  }
  return params;
}

export class SevenError extends Error {
  constructor(message: string, readonly code?: string, readonly status?: number) {
    super(message);
    this.name = "SevenError";
  }
}

/** `"900"`, `900` or `"  900\n"` — the bare-code body. */
export function bareCode(parsed: unknown): string | undefined {
  if (typeof parsed === "number" && Number.isInteger(parsed)) {
    return /^\d{3}$/.test(String(parsed)) ? String(parsed) : undefined;
  }
  if (typeof parsed === "string" && /^\s*\d{3}\s*$/.test(parsed)) return parsed.trim();
  return undefined;
}

function describe(code: string): string {
  return CODE_MEANINGS[code] ?? "unrecognised return code";
}

/**
 * Decide from the body whether seven accepted the call. Returns the parsed body, or throws.
 *
 * `allowCodes` are `success` codes that are not failures for the caller (the SMS endpoint's
 * `101` is a partial send whose per-recipient errors sit in `messages`).
 */
export function interpret(
  parsed: unknown,
  context: string,
  allowCodes: string[] = ["100"],
): unknown {
  const bare = bareCode(parsed);
  if (bare !== undefined) {
    if (allowCodes.includes(bare)) return { code: bare };
    throw new SevenError(`seven ${context} failed: code ${bare} — ${describe(bare)}`, bare);
  }
  if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) {
    const rec = parsed as Record<string, unknown>;
    const success = rec.success;
    const successCode = bareCode(success);
    if (successCode !== undefined && !allowCodes.includes(successCode)) {
      throw new SevenError(
        `seven ${context} failed: code ${successCode} — ${describe(successCode)}`,
        successCode,
      );
    }
    if (success === false || success === "false") {
      const detail = rec.error_message ?? rec.error ?? rec.error_text ?? "no detail given";
      throw new SevenError(`seven ${context} failed: ${String(detail)}`);
    }
    if (rec.status === false) {
      throw new SevenError(
        `seven ${context} failed: ${String(rec.status_message ?? "lookup refused")}`,
      );
    }
    // CNAM answers `{"code": "600"}` alone on a miss, with no `success` to read.
    const code = bareCode(rec.code);
    if (success === undefined && code !== undefined && !allowCodes.includes(code)) {
      throw new SevenError(`seven ${context} failed: code ${code} — ${describe(code)}`, code);
    }
  }
  return parsed;
}

/** Wrap an array body so every action returns an object. */
export function asObject(parsed: unknown, key: string): Record<string, unknown> {
  if (Array.isArray(parsed)) return { [key]: parsed };
  if (parsed && typeof parsed === "object") return parsed as Record<string, unknown>;
  return { [key]: parsed };
}

/** Replace a Slack forwarding URL (an incoming-webhook credential) with a presence flag. */
export function maskSlack(n: Record<string, unknown>): Record<string, unknown> {
  const fwd = n.forward_sms_mo as Record<string, Record<string, unknown>> | undefined;
  if (!fwd?.slack || !("uri" in fwd.slack)) return n;
  const { uri, ...slack } = fwd.slack;
  return {
    ...n,
    forward_sms_mo: { ...fwd, slack: { ...slack, has_uri: typeof uri === "string" && uri !== "" } },
  };
}

export class SevenClient {
  constructor(private readonly ctx: HookContext) {}

  async request(
    method: "GET" | "POST" | "PATCH" | "DELETE",
    path: string,
    options: RequestOptions & { allowCodes?: string[] } = {},
  ): Promise<unknown> {
    const url = `${API_BASE}${API_PREFIX}${path}${buildQuery(options.query)}`;
    const headers: Record<string, string> = { accept: "application/json" };
    const init: RequestInit = { method, headers };
    if (options.json !== undefined) {
      headers["content-type"] = "application/json";
      init.body = JSON.stringify(options.json);
    } else if (options.form !== undefined) {
      headers["content-type"] = "application/x-www-form-urlencoded";
      init.body = toParams(options.form).toString();
    }

    const res = await this.ctx.fetch(url, init);
    const text = await res.text();
    let parsed: unknown = undefined;
    if (text.trim() !== "") {
      try {
        parsed = JSON.parse(text);
      } catch {
        parsed = undefined;
      }
    }
    if (!res.ok) {
      const detail = text.trim().slice(0, 200) || res.statusText;
      throw new SevenError(
        `seven ${method} ${path} failed: HTTP ${res.status} — ${detail}`,
        bareCode(parsed),
        res.status,
      );
    }
    if (parsed === undefined && text.trim() !== "") {
      throw new SevenError(
        `seven ${method} ${path} answered a body that is not JSON: ${text.trim().slice(0, 120)}`,
      );
    }
    if (parsed === undefined) return {};
    return interpret(parsed, `${method} ${path}`, options.allowCodes);
  }
}

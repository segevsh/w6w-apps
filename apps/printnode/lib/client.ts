import type { HookContext } from "@w6w/types";

/**
 * PrintNode API client.
 *
 * Verified 2026-10-06 against PrintNode's own reference
 * (`https://www.printnode.com/en/docs/api/curl`, 590 KB single page) plus live
 * unauthenticated probes of `api.printnode.com`.
 *
 * ## One host, no version prefix
 *
 * The base URL is `https://api.printnode.com` and paths carry no `/v2`. There is
 * no regional host and no sandbox.
 *
 * ## Responses are not enveloped, and not all objects
 *
 *  - Lists (`/computers`, `/printers`, `/printjobs`) answer a **bare JSON array**.
 *    The total is only in the `Records-Total` response header.
 *  - `POST /printjobs` answers `201` with a **bare integer** — the new print
 *    job id — not an object.
 *  - `DELETE` on computers / print jobs answers an **array of the affected ids**.
 *  - `/printjobs/states` answers an **array of arrays** (one inner array of
 *    states per print job).
 *  - Webhook create/update/delete answer the **full webhook list**, not the one
 *    webhook you touched.
 *
 * ## Errors
 *
 * Failures are `{"code", "message", "uid"}`. `uid` equals the `Request-Id`
 * header and is what PrintNode support asks for. Note the documented 401 code
 * `InvalidCredentials` is NOT what the live API sends: it sends `BadRequest`
 * with a message, so the message, never the code, tells "no header" from "key
 * not found".
 *
 * ## Rate limit
 *
 * 10 requests/second per account, bursts tolerated, sustained excess answers
 * `429 TooManyRequests`.
 */
export const API_BASE = "https://api.printnode.com";

export type QueryValue = string | number | boolean | undefined | null;

export interface RequestOptions {
  method?: string;
  query?: Record<string, QueryValue>;
  body?: unknown;
}

interface PrintNodeErrorBody {
  code?: string;
  message?: string;
  uid?: string;
}

/** Is this the `{code, message}` error shape PrintNode documents? */
export function isErrorBody(v: unknown): v is PrintNodeErrorBody {
  return !!v && typeof v === "object" && !Array.isArray(v) &&
    typeof (v as PrintNodeErrorBody).message === "string" &&
    typeof (v as PrintNodeErrorBody).code === "string";
}

/** Keep an error message readable. */
export function truncate(text: string, max = 600): string {
  return text.length <= max ? text : `${text.slice(0, max)}… (${text.length} bytes truncated)`;
}

/** Turn a failed response into one actionable line, keeping the support `uid`. */
export function formatError(status: number, text: string): string {
  let body: unknown;
  try {
    body = JSON.parse(text);
  } catch {
    body = undefined;
  }
  if (isErrorBody(body)) {
    const uid = body.uid ? ` [request ${body.uid}]` : "";
    return `PrintNode ${status} ${body.code}: ${truncate(body.message ?? "")}${uid}`;
  }
  return `PrintNode ${status}: ${truncate(text || "(empty body)")}`;
}

/** Drop keys the caller left unset; `false` and `0` survive. */
export function compact(obj: Record<string, unknown>): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(obj)) {
    if (v !== undefined && v !== null && v !== "") out[k] = v;
  }
  return out;
}

/**
 * Normalise a "SET" — PrintNode's comma-separated list of positive integers —
 * accepting a number, an array or a string like `"1, 3,5"`. Returns `1,3,5`.
 * Anything else throws: a set is spliced into the URL path, so a stray `/` or
 * `?` must never get through.
 */
export function toSet(value: unknown, label: string): string {
  const parts = Array.isArray(value) ? value : String(value ?? "").split(",");
  const ids = parts.map((p) => String(p).trim()).filter((p) => p !== "");
  if (ids.length === 0) throw new Error(`${label} is required`);
  for (const id of ids) {
    if (!/^[1-9][0-9]*$/.test(id)) {
      throw new Error(`${label} must be positive integers separated by commas, got "${id}"`);
    }
  }
  return ids.join(",");
}

/** Like {@link toSet} but absence is allowed. */
export function toOptionalSet(value: unknown, label: string): string | undefined {
  if (value === undefined || value === null || value === "") return undefined;
  if (Array.isArray(value) && value.length === 0) return undefined;
  return toSet(value, label);
}

/** Path-escape a free-text segment (a scale device name). */
export function encodeSegment(v: string): string {
  return encodeURIComponent(String(v ?? "").trim());
}

/** Parse a `json` param that may arrive parsed or as a typed string. */
export function asOptionalJson<T>(value: unknown, label: string): T | undefined {
  if (value === undefined || value === null || value === "") return undefined;
  if (typeof value !== "string") return value as T;
  try {
    return JSON.parse(value) as T;
  } catch {
    throw new Error(`${label} is not valid JSON`);
  }
}

export interface ListResult<T> {
  items: T[];
  count: number;
  /** `Records-Total` header, when sent. */
  total?: number;
}

/**
 * Thin wrapper over `ctx.fetch`. Carries no credential: the host routes every
 * request through the Auth `sign` hook.
 */
export class PrintNodeClient {
  constructor(private readonly ctx: HookContext) {}

  private async send(path: string, opts: RequestOptions = {}): Promise<Response> {
    const url = new URL(`${API_BASE}${path}`);
    for (const [k, v] of Object.entries(opts.query ?? {})) {
      if (v !== undefined && v !== null && v !== "") url.searchParams.set(k, String(v));
    }
    const headers: Record<string, string> = { accept: "application/json" };
    let body: string | undefined;
    if (opts.body !== undefined) {
      headers["content-type"] = "application/json";
      body = JSON.stringify(opts.body);
    }
    const res = await this.ctx.fetch(url.toString(), {
      method: opts.method ?? "GET",
      headers,
      body,
    });
    if (!res.ok) throw new Error(formatError(res.status, await res.text().catch(() => "")));
    return res;
  }

  /** Request and parse the JSON body, whatever its shape. */
  async json<T = unknown>(path: string, opts: RequestOptions = {}): Promise<T> {
    const res = await this.send(path, opts);
    const text = await res.text();
    if (!text) return undefined as T;
    try {
      return JSON.parse(text) as T;
    } catch {
      throw new Error(`PrintNode returned a non-JSON body: ${truncate(text, 200)}`);
    }
  }

  /** A list endpoint: bare array plus the `Records-Total` header. */
  async list<T = unknown>(path: string, query: Record<string, QueryValue> = {}) {
    const res = await this.send(path, { query });
    const items = await res.json() as unknown;
    if (!Array.isArray(items)) throw new Error("PrintNode returned a non-array list body");
    const totalHeader = res.headers.get("records-total");
    const total = totalHeader !== null && totalHeader !== "" && !isNaN(Number(totalHeader))
      ? Number(totalHeader)
      : undefined;
    const out: ListResult<T> = { items: items as T[], count: items.length };
    if (total !== undefined) out.total = total;
    return out;
  }
}

/**
 * The webhook `secret` is the shared secret PrintNode sends to your target and
 * the only proof a delivery is genuine. Every webhook read and write answers it
 * back in clear, so it is dropped before an Action returns (a step result is
 * persisted and echoed into logs and other apps).
 */
export function stripWebhookSecrets<T>(hooks: T): T {
  if (!Array.isArray(hooks)) return hooks;
  return hooks.map((h) => {
    if (!h || typeof h !== "object") return h;
    const copy = { ...(h as Record<string, unknown>) };
    delete copy.secret;
    return copy;
  }) as T;
}

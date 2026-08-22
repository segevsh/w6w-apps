import type { HookContext, RedactedConnection } from "@w6w/types";

/**
 * Deepgram's REST API — verified against the OpenAPI 3 document Deepgram serves
 * at `developers.deepgram.com/openapi.json` (49 operations, fetched
 * 2026-08-18), and probed live the same day.
 *
 * ## Audio is fetched by Deepgram, which is what makes this usable at all
 *
 * `POST /v1/listen` accepts either raw audio bytes or a JSON body of
 * `{"url": "…"}`. An App runs in a sandbox with no local file to upload, so
 * this app only ever sends the URL and lets Deepgram fetch the media itself.
 * That is not a limitation here — it is the better pattern, because the audio
 * never passes through the workflow.
 *
 * ## Long jobs need the callback, and TTS needs it absolutely
 *
 * `callback` turns a synchronous request into an asynchronous one: Deepgram
 * answers immediately with a `request_id` and POSTs the result to the URL when
 * it is done.
 *
 *   - For **transcription** it is optional and strongly advisable — an hour of
 *     audio will outlive any HTTP timeout in the way.
 *   - For **text-to-speech** it is not optional in practice. `/v1/speak`
 *     without a callback streams **audio bytes** back, and a workflow step
 *     cannot do anything useful with an MP3 in a variable. With one, Deepgram
 *     delivers the audio to a URL that can store it.
 *
 * ## Three error shapes, measured
 *
 * Deepgram's services do not agree on how to report a failure. Verified
 * 2026-08-18 with a deliberately invalid key:
 *
 *   - management (`/v1/projects`) →
 *     `{"category":"UNAUTHORIZED","message":"Authentication failed.","details":"…","request_id":"…"}`
 *   - transcription (`/v1/listen`) →
 *     `{"err_code":"INVALID_AUTH","err_msg":"Invalid credentials.","request_id":"…"}`
 *   - auth (`/v1/auth/token`) → the plain text `Invalid credentials.`
 *
 * `describeError` reads all three rather than picking one and rendering the
 * others as `[object Object]`.
 */
export const BASE_URL = "https://api.deepgram.com";

/** Public (redacted-safe) connection metadata. */
export interface DeepgramConnectionDisplay {
  /** The project discovered at connect time — every management path needs it. */
  projectId?: string;
  projectName?: string;
}

/**
 * The project id every management path needs.
 *
 * A Deepgram API key belongs to exactly one project, so the id is discovered
 * once at connect time rather than typed into a dozen actions.
 */
export function projectIdFromConnection(connection: RedactedConnection | undefined): string {
  const display = (connection?.display ?? {}) as DeepgramConnectionDisplay;
  const id = String(display.projectId ?? "").trim();
  if (!id) {
    throw new Error(
      "this connection has no project id — reconnect it so the app knows which Deepgram project " +
        "to read",
    );
  }
  return id;
}

/** What may be sent as a query-string value. */
export type QueryValue = string | number | boolean | Array<string | number> | undefined | null;

export interface RequestOptions {
  method?: string;
  query?: Record<string, QueryValue>;
  body?: unknown;
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

/**
 * `compact` for a query string, keeping the value type the client expects.
 *
 * Params arrive as `unknown`, and an option left blank has to disappear rather
 * than be sent empty — Deepgram reads `?model=` as a request for a model named
 * the empty string. Arrays are kept as arrays, because Deepgram repeats a key
 * (`keyterm=a&keyterm=b`) rather than joining.
 */
export function query(obj: Record<string, unknown>): Record<string, QueryValue> {
  const out: Record<string, QueryValue> = {};
  for (const [k, v] of Object.entries(obj)) {
    if (v === undefined || v === null || v === "") continue;
    if (Array.isArray(v)) {
      const items = v.map((i) => (typeof i === "number" ? i : String(i)));
      if (items.length === 0) continue;
      out[k] = items;
      continue;
    }
    if (typeof v === "number" || typeof v === "boolean") out[k] = v;
    else out[k] = String(v);
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

/**
 * Deepgram's date filters take `YYYY-MM-DD`, and silently misread anything
 * else — a full ISO timestamp included, on the usage endpoints.
 */
export function isoDate(value: unknown, field: string): string | undefined {
  if (value === undefined || value === null || value === "") return undefined;
  const text = String(value).trim();
  if (/^\d{4}-\d{2}-\d{2}$/.test(text)) return text;
  const parsed = new Date(text);
  if (Number.isNaN(parsed.getTime())) {
    throw new Error(`\`${field}\` is not a date Deepgram can filter on: ${text}`);
  }
  return parsed.toISOString().slice(0, 10);
}

/**
 * Thin wrapper over `ctx.fetch`. It never sets Authorization — the runtime
 * routes every request through the auth `sign` hook.
 */
export class DeepgramClient {
  constructor(private ctx: HookContext) {}

  /** The project this connection's key belongs to. */
  get projectId(): string {
    return projectIdFromConnection(this.ctx.connection);
  }

  async request<T = unknown>(path: string, options: RequestOptions = {}): Promise<T> {
    const url = new URL(`${BASE_URL}${path}`);
    for (const [k, v] of Object.entries(options.query ?? {})) {
      if (v === undefined || v === null || v === "") continue;
      if (Array.isArray(v)) {
        // Deepgram repeats a key for list parameters — `keywords=a&keywords=b`.
        for (const item of v) url.searchParams.append(k, String(item));
      } else {
        url.searchParams.set(k, String(v));
      }
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
        `Deepgram ${res.status} for ${init.method} ${url.pathname}: ${
          describeError(res.status, text)
        }`,
      );
    }
    if (res.status === 204 || !text) return undefined as T;
    return JSON.parse(text) as T;
  }
}

/**
 * Turn a Deepgram error into something actionable, whichever of its three
 * shapes it arrived in.
 */
export function describeError(status: number, text: string): string {
  let detail = text.slice(0, 300);
  try {
    const body = JSON.parse(text) as {
      // The management shape.
      category?: string;
      message?: string;
      details?: string;
      // The transcription shape.
      err_code?: string;
      err_msg?: string;
      request_id?: string;
      // Occasionally seen on validation failures.
      reason?: string;
    };
    const message = body?.message ?? body?.err_msg ?? body?.reason;
    const code = body?.category ?? body?.err_code;
    const parts = [message ?? code ?? detail];
    if (body?.details && body.details !== message) parts.push(body.details);
    if (code && message) parts.push(`(${code})`);
    if (body?.request_id) parts.push(`[request ${body.request_id}]`);
    detail = parts.filter(Boolean).join(" ");
  } catch { /* /v1/auth answers in plain text */ }

  if (status === 401 || status === 403) {
    return `${detail} — check the API key, and that it has the scope this call needs: Deepgram ` +
      "keys carry scopes (`member`, `admin`, `owner`, `usage:read` …) granted when the key was " +
      "created, and a narrow key authenticates fine and is refused per endpoint";
  }
  if (status === 429) {
    return `${detail} — Deepgram limits CONCURRENT requests rather than requests per minute, so ` +
      "this means too many are in flight at once, not that a quota is exhausted. Fewer parallel " +
      "steps, not a longer wait";
  }
  return detail || `${status}`;
}

import type { HookContext } from "@w6w/types";

/**
 * SOLAPI API client.
 *
 * Verified 2026-10-06 against the SOLAPI developer reference (solapi.com/developers/api/*, a
 * server-rendered docs site with no OpenAPI document) plus unauthenticated live probes of
 * `api.solapi.com`.
 *
 * ## Shapes
 *
 * - One host, `https://api.solapi.com`, resource URLs `/<service>/<version>/<path>`
 *   (`/messages/v4/...`, `/cash/v1/...`, `/senderid/v1/...`, `/kakao/v2/...`, `/storage/v1/...`).
 * - There is NO success envelope: a 2xx body is the resource itself. A failure is
 *   `{ "errorCode": "...", "errorMessage": "..." }` (the 429 variant spells the second key
 *   `message`). {@link errorText} reads both.
 * - Message and group lists are keyed OBJECTS (`messageList` / `groupList`, keyed by id), not
 *   arrays, with `nextKey` as the cursor (absent on the last page). {@link asItems} flattens
 *   either form to an array.
 * - The credential is never built here: only the Auth `sign` hook adds `Authorization`.
 */

export const API_BASE = "https://api.solapi.com";

export type QueryValue = string | number | boolean | undefined | null;

export interface RequestOptions {
  method?: string;
  query?: Record<string, QueryValue>;
  body?: unknown;
}

/** Headers every request carries. The credential is not here — only `sign` adds it. */
export function baseHeaders(): Record<string, string> {
  return { accept: "application/json" };
}

/** Escape a path segment. */
export function encodeId(id: string | number): string {
  return encodeURIComponent(String(id).trim());
}

/** Drop undefined / null / empty-string / empty-array entries. */
export function compact(obj: Record<string, unknown>): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(obj)) {
    if (v === undefined || v === null || v === "") continue;
    if (Array.isArray(v) && v.length === 0) continue;
    out[k] = v;
  }
  return out;
}

export function queryString(query: Record<string, QueryValue> = {}): string {
  const sp = new URLSearchParams();
  for (const [k, v] of Object.entries(compact(query))) sp.append(k, String(v));
  const s = sp.toString();
  return s ? `?${s}` : "";
}

/** A value that must be a plain object, else `{}`. */
export function obj(v: unknown): Record<string, unknown> {
  return v && typeof v === "object" && !Array.isArray(v) ? v as Record<string, unknown> : {};
}

/** An array as-is, an object keyed by id as its values, anything else as `[]`. */
export function asItems(v: unknown): unknown[] {
  if (Array.isArray(v)) return v;
  if (v && typeof v === "object") return Object.values(v as Record<string, unknown>);
  return [];
}

/** A JSON-typed param arrives as a value or as a JSON string; return the parsed value. */
export function parseJsonParam(v: unknown, name: string): unknown {
  if (typeof v !== "string") return v;
  try {
    return JSON.parse(v);
  } catch {
    throw new Error(`SOLAPI: "${name}" is not valid JSON`);
  }
}

/** The vendor's failure body, as one string: `errorCode: errorMessage`. */
export function errorText(body: unknown): string | undefined {
  const b = obj(body);
  const code = typeof b.errorCode === "string" ? b.errorCode : undefined;
  const msg = typeof b.errorMessage === "string"
    ? b.errorMessage
    : typeof b.message === "string"
    ? b.message
    : undefined;
  if (code && msg) return `${code}: ${msg}`;
  return code ?? msg;
}

export class SolapiClient {
  constructor(private ctx: HookContext) {}

  /** Send one request; return the parsed JSON body, throwing on any non-2xx. */
  async json(path: string, opts: RequestOptions = {}): Promise<unknown> {
    const headers = baseHeaders();
    let body: string | undefined;
    if (opts.body !== undefined) {
      headers["content-type"] = "application/json";
      body = JSON.stringify(opts.body);
    }
    const res = await this.ctx.fetch(`${API_BASE}${path}${queryString(opts.query)}`, {
      method: opts.method ?? "GET",
      headers,
      body,
    });
    const text = await res.text();
    let parsed: unknown = null;
    if (text) {
      try {
        parsed = JSON.parse(text);
      } catch {
        if (res.ok) throw new Error(`SOLAPI ${res.status}: response was not JSON`);
      }
    }
    if (!res.ok) {
      const msg = errorText(parsed) ?? (text ? text.slice(0, 300) : res.statusText);
      throw new Error(`SOLAPI ${res.status}${msg ? `: ${msg}` : ""}`);
    }
    return parsed;
  }

  /** A cursor-paged list: `listKey` holds the rows (array or id-keyed object). */
  async page(
    path: string,
    listKey: string,
    opts: RequestOptions = {},
  ): Promise<Record<string, unknown>> {
    const b = obj(await this.json(path, opts));
    const items = asItems(b[listKey]);
    return {
      items,
      count: items.length,
      nextKey: typeof b.nextKey === "string" && b.nextKey ? b.nextKey : null,
      limit: typeof b.limit === "number" ? b.limit : null,
    };
  }
}

/**
 * The result of a send: `{ failedMessageList, groupInfo, messageList? }` -> a flat summary.
 * A message in `failedMessageList` was NOT sent, even though the HTTP status is 200.
 */
export function sendResult(body: unknown): Record<string, unknown> {
  const b = obj(body);
  const group = obj(b.groupInfo);
  const failed = asItems(b.failedMessageList);
  return {
    groupId: typeof group.groupId === "string" ? group.groupId : null,
    status: typeof group.status === "string" ? group.status : null,
    count: group.count ?? null,
    failedCount: failed.length,
    failedMessageList: failed,
    messageList: asItems(b.messageList),
  };
}

/** A group object -> its headline fields plus the whole group. */
export function groupResult(body: unknown): Record<string, unknown> {
  const g = obj(body);
  return {
    groupId: typeof g.groupId === "string" ? g.groupId : null,
    status: typeof g.status === "string" ? g.status : null,
    scheduledDate: g.scheduledDate ?? null,
    count: g.count ?? null,
    group: g,
  };
}

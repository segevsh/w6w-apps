/**
 * LiveChat (Text) — Agent Chat Web API v3.6 and Configuration API v3.6.
 *
 * Every method, parameter and response field in this app comes from the vendor's own reference,
 * fetched 2026-10-06:
 *   - https://platform.text.com/docs/messaging/agent-chat-api   (Agent Chat Web API, 3.6 stable)
 *   - https://platform.text.com/docs/management/configuration-api
 *
 * ## Shape of the API
 *
 * It is RPC over POST, not REST. Every call is
 * `POST https://api.livechatinc.com/v3.6/<surface>/action/<action>` with a JSON body, where
 * `<surface>` is `agent` (chats, threads, events, customers, routing status) or `configuration`
 * (agents, groups, tags, webhooks, ...). Reads are POSTs too. The version is in the path, so the
 * optional `X-API-Version` header is not needed.
 *
 * ## Errors are an envelope, and the status code is only a hint
 *
 * Every failure is `{"error":{"type","message","data?"}}` (measured live: no header →
 * `type: "authentication"`, "No `Authorization` header"; a wrong token → `type: "authentication"`,
 * "Invalid access token", both HTTP 401). `type` is the discriminator. One type deserves a call-out:
 * `misdirected_request` ("Wrong region") carries the right region in `error.data.region`.
 *
 * ## Mutations answer "No response payload (200 OK)"
 *
 * Several actions return an empty body, others `{}`. `call` returns `{}` for both so callers never
 * trip on `JSON.parse("")`.
 *
 * ## Pagination
 *
 * Responses carry `next_page_id` (and `previous_page_id`) only when there is another page. The next
 * request must send `page_id` and NOTHING ELSE the first request carried — `filters`, `limit` and
 * `sort_order` are remembered server-side and are a validation error alongside `page_id`.
 * `page_id` expires after one month.
 */
import type { HookContext } from "@w6w/types";

export const API_URL = "https://api.livechatinc.com/v3.6";

export type Surface = "agent" | "configuration";

/** The vendor's error envelope. */
export interface LiveChatError {
  type?: string;
  message?: string;
  data?: Record<string, unknown>;
}

/** Pull the vendor's `error` object out of a parsed body, if it is one. */
export function errorOf(body: unknown): LiveChatError | undefined {
  if (!body || typeof body !== "object" || Array.isArray(body)) return undefined;
  const e = (body as { error?: unknown }).error;
  if (!e || typeof e !== "object" || Array.isArray(e)) return undefined;
  const err = e as LiveChatError;
  return typeof err.type === "string" || typeof err.message === "string" ? err : undefined;
}

/** One human line from the error envelope, including the region hint when present. */
export function describeError(err: LiveChatError): string {
  const parts = [err.type ?? "error"];
  if (err.message) parts.push(err.message);
  const region = err.data?.region;
  if (typeof region === "string") parts.push(`(correct region: ${region})`);
  return parts.join(": ");
}

/** The URL of one action. */
export function actionUrl(surface: Surface, action: string): string {
  return `${API_URL}/${surface}/action/${action}`;
}

export class LiveChatClient {
  constructor(private ctx: HookContext) {}

  /**
   * POST one action. Throws on a vendor error envelope — whatever the HTTP status, because the
   * body is authoritative — and on any non-2xx. Returns the parsed body, `{}` when it is empty.
   */
  async call<T = unknown>(
    surface: Surface,
    action: string,
    body: Record<string, unknown> = {},
  ): Promise<T> {
    const res = await this.ctx.fetch(actionUrl(surface, action), {
      method: "POST",
      headers: { accept: "application/json", "content-type": "application/json" },
      body: JSON.stringify(body),
    });
    const raw = await res.text().catch(() => "");
    let parsed: unknown;
    try {
      parsed = raw ? JSON.parse(raw) : {};
    } catch {
      throw new Error(
        `LiveChat ${res.status} for ${action}: non-JSON body ${JSON.stringify(raw.slice(0, 200))}`,
      );
    }
    const err = errorOf(parsed);
    if (err) throw new Error(`LiveChat ${res.status} for ${action}: ${describeError(err)}`);
    if (!res.ok) throw new Error(`LiveChat ${res.status} for ${action}`);
    return parsed as T;
  }

  agent<T = unknown>(action: string, body: Record<string, unknown> = {}): Promise<T> {
    return this.call<T>("agent", action, body);
  }

  config<T = unknown>(action: string, body: Record<string, unknown> = {}): Promise<T> {
    return this.call<T>("configuration", action, body);
  }
}

/** Drop `undefined`, `null` and empty-string values so optional inputs are simply not sent. */
export function compact(obj: Record<string, unknown>): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(obj)) {
    if (v === undefined || v === null || v === "") continue;
    out[k] = v;
  }
  return out;
}

/** A required, non-empty string input. */
export function requireString(value: unknown, name: string): string {
  if (typeof value !== "string" || value.trim() === "") {
    throw new Error(`\`${name}\` is required`);
  }
  return value.trim();
}

/** An optional string input: trimmed, or undefined when blank. */
export function optString(value: unknown): string | undefined {
  return typeof value === "string" && value.trim() !== "" ? value.trim() : undefined;
}

/** An optional member of a closed set. */
export function optEnum<T extends string>(
  value: unknown,
  name: string,
  allowed: readonly T[],
): T | undefined {
  if (value === undefined || value === null || value === "") return undefined;
  if (typeof value === "string" && (allowed as readonly string[]).includes(value)) {
    return value as T;
  }
  throw new Error(`\`${name}\` must be one of: ${allowed.join(", ")}`);
}

/** An optional integer in `[min, max]`. */
export function optInt(value: unknown, name: string, min: number, max: number): number | undefined {
  if (value === undefined || value === null || value === "") return undefined;
  const n = Number(value);
  if (!Number.isInteger(n) || n < min || n > max) {
    throw new Error(`\`${name}\` must be an integer from ${min} to ${max}`);
  }
  return n;
}

/**
 * An optional array of strings. Accepts a real array or a comma-separated string (the form a
 * workflow field usually produces); blank entries are dropped.
 */
export function optStringList(value: unknown, name: string): string[] | undefined {
  if (value === undefined || value === null || value === "") return undefined;
  const items = Array.isArray(value) ? value : typeof value === "string" ? value.split(",") : null;
  if (!items) throw new Error(`\`${name}\` must be a list of strings`);
  const out = items.map((v) => String(v).trim()).filter((v) => v !== "");
  return out.length ? out : undefined;
}

/**
 * An optional array of integers (group ids). LiveChat group ids are integers (0 is the default
 * group), so `0` is a valid element and must not be filtered as "empty".
 */
export function optIntList(value: unknown, name: string): number[] | undefined {
  const items = optStringList(value, name);
  if (!items) return undefined;
  return items.map((s) => {
    const n = Number(s);
    if (!Number.isInteger(n) || n < 0) throw new Error(`\`${name}\` must contain integers`);
    return n;
  });
}

/** An optional JSON object — a real object, or a string that parses to one. */
export function optObject(value: unknown, name: string): Record<string, unknown> | undefined {
  if (value === undefined || value === null || value === "") return undefined;
  let v = value;
  if (typeof v === "string") {
    try {
      v = JSON.parse(v);
    } catch {
      throw new Error(`\`${name}\` must be valid JSON`);
    }
  }
  if (!v || typeof v !== "object" || Array.isArray(v)) {
    throw new Error(`\`${name}\` must be a JSON object`);
  }
  return v as Record<string, unknown>;
}

/**
 * The paging inputs shared by the paginated Agent API reads.
 *
 * `page_id` and the first-request options are mutually exclusive on the vendor side, so mixing
 * them is refused here, before a request, with a message that says why.
 */
export function pagingBody(
  input: { pageId?: unknown; limit?: unknown; sortOrder?: unknown },
  firstPageOnly: Record<string, unknown>,
  maxLimit = 100,
): Record<string, unknown> {
  const pageId = optString(input.pageId);
  const limit = optInt(input.limit, "limit", 1, maxLimit);
  const sortOrder = optEnum(input.sortOrder, "sortOrder", ["asc", "desc"] as const);
  const filters = compact(firstPageOnly);
  if (pageId) {
    if (limit !== undefined || sortOrder !== undefined || Object.keys(filters).length > 0) {
      throw new Error(
        "`pageId` cannot be combined with filters, `limit` or `sortOrder` — LiveChat remembers " +
          "them from the first request",
      );
    }
    return { page_id: pageId };
  }
  return compact({ ...filters, limit, sort_order: sortOrder });
}

export const PAGING_PARAMS = [
  {
    key: "limit",
    label: "Limit",
    type: "number" as const,
    hint: "Records per page, 1–100. Not allowed together with `Page ID`.",
    validation: { min: 1, max: 100, integer: true },
  },
  {
    key: "sortOrder",
    label: "Sort order",
    type: "select" as const,
    options: [
      { value: "desc", label: "Newest first (default)" },
      { value: "asc", label: "Oldest first" },
    ],
  },
  {
    key: "pageId",
    label: "Page ID",
    type: "string" as const,
    hint:
      "Pass the previous response's `next_page_id` (or `previous_page_id`) to continue. Filters, " +
      "limit and sort order are remembered from the first request and cannot be sent again. " +
      "Expires after one month.",
  },
];

/** A configuration-API list: a bare array becomes `{items, count}`; anything else is kept as `raw`. */
export function asList(body: unknown): { items: unknown[]; count: number; raw?: unknown } {
  return Array.isArray(body)
    ? { items: body, count: body.length }
    : { items: [], count: 0, raw: body };
}

export const LIST_OUTPUT = [
  { key: "items", type: "array" as const, label: "Records returned" },
  { key: "count", type: "number" as const, label: "Number of records" },
  {
    key: "raw",
    type: "object" as const,
    label: "The body, when LiveChat did not answer with an array",
  },
];

/** The paging fields of a paginated Agent API response. */
export function pageInfo(body: Record<string, unknown>): {
  nextPageId?: string;
  previousPageId?: string;
} {
  return {
    nextPageId: typeof body.next_page_id === "string" ? body.next_page_id : undefined,
    previousPageId: typeof body.previous_page_id === "string" ? body.previous_page_id : undefined,
  };
}

export const PAGE_OUTPUT = [
  {
    key: "nextPageId",
    type: "string" as const,
    label: "Pass as `Page ID` for the next page — absent on the last page",
  },
  { key: "previousPageId", type: "string" as const, label: "Pass as `Page ID` to go back" },
];

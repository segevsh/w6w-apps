import type { HookContext, Param } from "@w6w/types";

/** Every Refiner endpoint hangs off this one host. */
export const API_BASE = "https://api.refiner.io";

/** The only API version the vendor documents. */
export const API_PREFIX = "/v1";

export type QueryValue =
  | string
  | number
  | boolean
  | undefined
  | null
  | string[]
  | Record<string, string | number | boolean | undefined | null>;

export interface RequestOptions {
  method?: string;
  query?: Record<string, QueryValue>;
  body?: Record<string, unknown>;
}

/** Refiner's list envelope: `items` plus a `pagination` block. */
export interface RefinerPage<T> {
  items: T[];
  pagination?: {
    items_count?: number;
    current_page?: number;
    last_page?: number;
    page_length?: number;
    next_page_cursor?: string | null;
  };
}

/**
 * The vendor documents three error shapes in practice: `{"error": "..."}` (most
 * failures, including a missing or malformed key), and `{"message": "..."}`
 * (a well-formed but unknown key, which is also a **404**, not a 401).
 */
export interface RefinerErrorBody {
  error?: string;
  message?: string;
  code?: number;
}

export function compact<T>(obj: Record<string, T>): Record<string, T> {
  const out: Record<string, T> = {};
  for (const [k, v] of Object.entries(obj)) {
    if (v !== undefined && v !== null && v !== "") out[k] = v;
  }
  return out;
}

export function truncate(text: string, max = 300): string {
  return text.length <= max ? text : `${text.slice(0, max)}… (${text.length} bytes)`;
}

/** Comma- or array-form list to a clean string array; empty collapses to undefined. */
export function toList(v: string[] | string | undefined | null): string[] | undefined {
  if (v === undefined || v === null || v === "") return undefined;
  const items = (Array.isArray(v) ? v : v.split(","))
    .map((s) => String(s).trim())
    .filter(Boolean);
  return items.length ? items : undefined;
}

/** Parse a JSON-object param that may arrive as an object or as a JSON string. */
export function asObject(value: unknown, label: string): Record<string, unknown> | undefined {
  if (value === undefined || value === null || value === "") return undefined;
  let parsed = value;
  if (typeof value === "string") {
    try {
      parsed = JSON.parse(value);
    } catch {
      throw new Error(`${label} is not valid JSON`);
    }
  }
  if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
    throw new Error(`${label} must be a JSON object`);
  }
  return parsed as Record<string, unknown>;
}

/**
 * Pull the vendor's own message out of an error body, whichever key it used.
 */
export function errorMessage(raw: string): string {
  try {
    const parsed = JSON.parse(raw) as RefinerErrorBody;
    return parsed.error ?? parsed.message ?? truncate(raw);
  } catch {
    return truncate(raw.trim());
  }
}

export function formatRefinerError(
  status: number,
  method: string,
  path: string,
  raw: string,
): string {
  const detail = errorMessage(raw);
  return `Refiner ${method} ${path} failed with ${status}${detail ? `: ${detail}` : ""}`;
}

/**
 * Identify a contact the way Refiner's own routes do: any ONE of `id`, `email`
 * or the Refiner `uuid`. Returns the fields to send, or throws when none given.
 */
export function contactRef(
  input: { id?: string; email?: string; uuid?: string },
): Record<string, string> {
  const ref = compact({
    id: input.id?.trim(),
    email: input.email?.trim(),
    uuid: input.uuid?.trim(),
  }) as Record<string, string>;
  if (Object.keys(ref).length === 0) {
    throw new Error("provide one of: user id, email, or Refiner contact uuid");
  }
  return ref;
}

/** The three optional identifiers, as Action params. */
export const CONTACT_REF_PARAMS: Param[] = [
  {
    key: "id",
    label: "User ID",
    type: "string",
    hint: "Your own user id — the one used when the contact was identified. Preferred.",
  },
  {
    key: "email",
    label: "Email",
    type: "string",
    hint: "Alternative to the user id. Several contacts can share an email; prefer the id.",
  },
  {
    key: "uuid",
    label: "Refiner contact UUID",
    type: "string",
    hint: "The `uuid` Refiner returned when the contact was created.",
  },
];

/** The shared list-pagination params. */
export const PAGE_PARAMS: Param[] = [
  {
    key: "page",
    label: "Page",
    type: "number",
    hint: "1-based page number. Use a cursor instead for sets over ~10,000 rows.",
  },
  {
    key: "pageLength",
    label: "Page length",
    type: "number",
    default: 50,
    validation: { min: 1, max: 1000, integer: true },
    hint: "Rows per page. The vendor default is 100 and its ceiling is 1000.",
  },
];

export const CURSOR_PARAM: Param = {
  key: "pageCursor",
  label: "Page cursor",
  type: "string",
  hint: "`pagination.next_page_cursor` from the previous page. Much faster than page numbers on " +
    "large sets.",
};

/**
 * Serialise a query value into Refiner's bracket syntax: arrays become
 * `key[]=v`, objects become `key[sub]=v`.
 */
function appendQuery(url: URL, key: string, value: QueryValue): void {
  if (value === undefined || value === null || value === "") return;
  if (Array.isArray(value)) {
    for (const v of value) url.searchParams.append(`${key}[]`, String(v));
  } else if (typeof value === "object") {
    for (const [sub, v] of Object.entries(value)) {
      if (v === undefined || v === null || v === "") continue;
      url.searchParams.append(`${key}[${sub}]`, String(v));
    }
  } else {
    url.searchParams.set(key, String(value));
  }
}

/**
 * Thin wrapper over `ctx.fetch`. No credential is attached here: the Auth
 * `sign` hook stamps `Authorization: Bearer <key>` on every request.
 */
export class RefinerClient {
  constructor(private ctx: HookContext) {}

  async json<T = unknown>(path: string, options: RequestOptions = {}): Promise<T> {
    const method = (options.method ?? "GET").toUpperCase();
    const url = new URL(`${API_BASE}${API_PREFIX}${path}`);
    for (const [k, v] of Object.entries(options.query ?? {})) appendQuery(url, k, v);

    const headers: Record<string, string> = { accept: "application/json" };
    const init: RequestInit = { method, headers };
    if (options.body !== undefined) {
      headers["content-type"] = "application/json";
      init.body = JSON.stringify(options.body);
    }

    const res = await this.ctx.fetch(url.toString(), init);
    const text = await res.text().catch(() => "");
    if (!res.ok) throw new Error(formatRefinerError(res.status, method, url.pathname, text));
    if (!text) return undefined as T;
    try {
      return JSON.parse(text) as T;
    } catch {
      throw new Error(
        `Refiner ${method} ${url.pathname} answered ${res.status} with a non-JSON body: ` +
          truncate(text.trim(), 120),
      );
    }
  }
}

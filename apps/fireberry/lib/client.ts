import type { HookContext } from "@w6w/types";

/** `servers[0].url` for every endpoint in the Fireberry reference (record, v3 and metadata). */
export const API_URL = "https://api.fireberry.com";

/** Percent-encode one path segment (object names, GUIDs and field names are caller strings). */
export function seg(value: string | number): string {
  return encodeURIComponent(String(value).trim());
}

/**
 * Accept a JSON value either parsed or as the JSON text a form field produces.
 * Anything unparseable passes through so the vendor, not this app, rejects it.
 */
export function jsonValue(value: unknown): unknown {
  if (typeof value !== "string") return value;
  const trimmed = value.trim();
  if (trimmed === "") return undefined;
  try {
    return JSON.parse(trimmed);
  } catch {
    return value;
  }
}

export type Query = Record<string, string | number | boolean | undefined | null>;

/** Build `?a=1&b=2`, skipping unset, null and empty values. */
export function buildQuery(query: Query | undefined): string {
  if (!query) return "";
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(query)) {
    if (value === undefined || value === null || value === "") continue;
    params.set(key, String(value));
  }
  const text = params.toString();
  return text ? `?${text}` : "";
}

/**
 * Fireberry has no single error envelope. Legacy `/api/record` and `/metadata`
 * errors are `{"Message": "..."}` (capital M), the v3 endpoints answer
 * `{"message": "..."}` or `{"error": "Unauthorized", "status": 401, "message": "..."}`,
 * and a legacy 401 has an EMPTY body.
 */
export interface FireberryErrorBody {
  Message?: string;
  message?: string;
  error?: string;
  status?: number;
  success?: boolean;
}

/** One human line from a parsed error body; falls back to the raw text. */
export function errorText(body: unknown, raw = ""): string {
  const b = (body ?? {}) as FireberryErrorBody;
  const msg = b.Message ?? b.message;
  if (msg && b.error && typeof b.error === "string") return `${msg} (${b.error})`;
  if (msg) return msg;
  if (typeof b.error === "string") return b.error;
  return raw.trim().slice(0, 200);
}

export interface RequestOptions {
  query?: Query;
  body?: unknown;
}

/**
 * Thin client over `https://api.fireberry.com`. Credentials are never handled
 * here: the runtime routes every `ctx.fetch` through the Auth `sign` hook, which
 * stamps the `tokenid` header.
 *
 * Returns the parsed response body (`{ success, data, message }` on the legacy
 * endpoints). A 2xx body with `success: false` is thrown as an error.
 */
export class FireberryClient {
  constructor(private readonly ctx: HookContext) {}

  async request<T = unknown>(
    method: "GET" | "POST" | "PUT" | "DELETE",
    path: string,
    options: RequestOptions = {},
  ): Promise<T> {
    const url = `${API_URL}${path}${buildQuery(options.query)}`;
    const headers: Record<string, string> = { accept: "application/json" };
    const init: RequestInit = { method, headers };
    if (options.body !== undefined) {
      headers["content-type"] = "application/json";
      init.body = JSON.stringify(options.body);
    }

    const res = await this.ctx.fetch(url, init);
    const text = await res.text();
    let parsed: unknown = undefined;
    if (text.trim() !== "") {
      try {
        parsed = JSON.parse(text);
      } catch { /* non-JSON body: reported below if the request failed */ }
    }

    if (!res.ok) {
      const detail = errorText(parsed, text) || "no error body";
      throw new Error(`Fireberry ${method} ${path} failed: HTTP ${res.status} — ${detail}`);
    }
    if ((parsed as FireberryErrorBody | undefined)?.success === false) {
      const detail = errorText(parsed, text) || "success was false";
      throw new Error(`Fireberry ${method} ${path} failed: ${detail}`);
    }
    return (parsed ?? {}) as T;
  }
}

/** Envelope of the legacy list endpoints (`GET /api/record/{object}`, related records). */
export interface RecordPage {
  data?: {
    PrimaryKey?: string;
    PrimaryField?: string;
    Total_Records?: number;
    Page_Size?: number;
    Page_Number?: number;
    Records?: unknown[];
  };
}

/** Flatten a legacy list envelope into the shape the list actions return. */
export function pageOutput(body: RecordPage) {
  const d = body.data ?? {};
  const pageNumber = d.Page_Number;
  const pageSize = d.Page_Size;
  const total = d.Total_Records;
  return {
    records: d.Records ?? [],
    primaryKey: d.PrimaryKey,
    primaryField: d.PrimaryField,
    totalRecords: total,
    pageNumber,
    pageSize,
    hasMore: typeof total === "number" && typeof pageNumber === "number" &&
      typeof pageSize === "number" && pageNumber * pageSize < total,
  };
}

export const PAGE_OUTPUT = [
  { key: "records", type: "array", label: "Records on this page" },
  { key: "primaryKey", type: "string", label: "System name of the ID field" },
  { key: "primaryField", type: "string", label: "System name of the display-name field" },
  { key: "totalRecords", type: "number", label: "Total records the caller can see" },
  { key: "pageNumber", type: "number", label: "Page returned" },
  { key: "pageSize", type: "number", label: "Page size used" },
  {
    key: "hasMore",
    type: "boolean",
    label: "True when more pages remain (page 10 is the maximum)",
  },
] as const;

/** Compact an object, dropping `undefined`. `null` is kept: it clears a field. */
export function compact(obj: Record<string, unknown>): Record<string, unknown> {
  return Object.fromEntries(Object.entries(obj).filter(([, v]) => v !== undefined));
}

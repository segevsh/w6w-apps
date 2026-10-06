import type { FileRef, HookContext, OutputField } from "@w6w/types";

/**
 * QuickChart — https://quickchart.io. Every route this app uses is documented in the vendor's own
 * OpenAPI document (`/openapi.json`, read 2026-10-06) and its docs site (`/documentation/`).
 *
 * The credential (an optional API key) is never handled here: the Auth `sign` hook adds
 * `Authorization: Bearer <key>` when a connection has one, and nothing otherwise.
 */
export const API_BASE = "https://quickchart.io";

export function truncate(text: string, max: number): string {
  return text.length > max ? `${text.slice(0, max - 1)}…` : text;
}

/** Drops `undefined`, `null` and empty-string entries so the vendor's own defaults apply. */
export function compact(obj: Record<string, unknown>): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(obj)) {
    if (v === undefined || v === null || v === "") continue;
    out[k] = v;
  }
  return out;
}

export interface RequestOptions {
  /** Non-2xx statuses the caller wants back as a response instead of an error. */
  accept?: number[];
}

/**
 * Where QuickChart puts an error depends on the route. Rendering routes answer with an IMAGE of
 * the error (in the requested format) and put the message in the `X-quickchart-error` header;
 * the JSON routes answer `{error}`, `{errors: []}` or plain text.
 */
export function errorText(headerValue: string | null, raw: string): string {
  if (headerValue) return headerValue;
  const trimmed = raw.trim();
  if (!trimmed) return "";
  try {
    const parsed = JSON.parse(trimmed) as Record<string, unknown>;
    if (Array.isArray(parsed.errors) && parsed.errors.length > 0) {
      return parsed.errors.map(String).join("; ");
    }
    const msg = parsed.error ?? parsed.message;
    if (typeof msg === "string") return msg;
  } catch { /* not JSON */ }
  // A rendered error image would be binary garbage here; only keep readable text.
  // deno-lint-ignore no-control-regex
  return /[\x00-\x08\x0e-\x1f]/.test(trimmed.slice(0, 200)) ? "" : trimmed;
}

export function formatError(
  status: number,
  method: string,
  path: string,
  headerValue: string | null,
  raw: string,
  retryAfter?: string | null,
): string {
  const text = errorText(headerValue, raw);
  const hint = status === 429
    ? ` — the free tier is rate limited${
      retryAfter ? ` (retry after ${retryAfter}s)` : ""
    }; back off, or add an API key to the connection`
    : status === 403
    ? " — the API key or signature was rejected"
    : "";
  return truncate(
    `QuickChart ${status} for ${method} ${path}: ${text || "no message"}${hint}`,
    1000,
  );
}

export function toBase64(bytes: Uint8Array): string {
  let binary = "";
  const chunk = 0x8000;
  for (let i = 0; i < bytes.length; i += chunk) {
    binary += String.fromCharCode(...bytes.subarray(i, i + chunk));
  }
  return btoa(binary);
}

export function fromBase64(text: string): Uint8Array {
  const binary = atob(text.replace(/\s+/g, ""));
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return bytes;
}

export interface ImageResult {
  /** A reference to the bytes in the run's file store, when the host has one. */
  file?: FileRef;
  /** Standard base64 of the bytes — only when the host has no file store. */
  base64?: string;
  /** The markup itself, for SVG output. */
  svg?: string;
  contentType: string;
  sizeBytes: number;
}

const EXTENSION: Record<string, string> = {
  "image/png": "png",
  "image/jpeg": "jpg",
  "image/webp": "webp",
  "image/svg+xml": "svg",
  "application/pdf": "pdf",
};

export class QuickChartClient {
  constructor(private ctx: HookContext) {}

  async send(
    method: "GET" | "POST",
    path: string,
    body?: unknown,
    options: RequestOptions = {},
  ): Promise<Response> {
    const headers: Record<string, string> = {};
    const init: RequestInit = { method, headers };
    if (body !== undefined) {
      headers["content-type"] = "application/json";
      init.body = JSON.stringify(body);
    }
    const res = await this.ctx.fetch(`${API_BASE}${path}`, init);
    if (!res.ok && !(options.accept ?? []).includes(res.status)) {
      const raw = await res.text().catch(() => "");
      throw new Error(
        formatError(
          res.status,
          method,
          path,
          res.headers.get("x-quickchart-error"),
          raw,
          res.headers.get("retry-after"),
        ),
      );
    }
    return res;
  }

  async json<T = Record<string, unknown>>(
    path: string,
    body: unknown,
    options: RequestOptions = {},
  ): Promise<T> {
    const res = await this.send("POST", path, body, options);
    const text = await res.text();
    try {
      return JSON.parse(text) as T;
    } catch {
      throw new Error(
        `QuickChart ${res.status} for ${path}: expected JSON, got ${truncate(text, 200)}`,
      );
    }
  }

  /**
   * POSTs a render request and hands the image to the host's file store.
   *
   * `format: "base64"` (chart, QR) answers `text/plain` base64 of a PNG; it is decoded back to
   * bytes so the caller always gets a real image file, not a text blob.
   */
  async image(path: string, body: unknown, basename: string): Promise<ImageResult> {
    const res = await this.send("POST", path, body);
    let contentType = (res.headers.get("content-type") ?? "application/octet-stream")
      .split(";")[0].trim().toLowerCase();
    let bytes: Uint8Array;
    if (contentType === "text/plain") {
      bytes = fromBase64(await res.text());
      contentType = "image/png";
    } else {
      bytes = new Uint8Array(await res.arrayBuffer());
    }
    const out: ImageResult = { contentType, sizeBytes: bytes.length };
    if (contentType === "image/svg+xml") out.svg = new TextDecoder().decode(bytes);
    if (this.ctx.file) {
      out.file = await this.ctx.file.create(bytes, {
        contentType,
        filename: `${basename}.${EXTENSION[contentType] ?? "bin"}`,
      });
    } else {
      out.base64 = toBase64(bytes);
    }
    return out;
  }
}

/** The output fields every image-returning action declares. */
export const IMAGE_OUTPUT: OutputField[] = [
  { key: "file", type: "file", label: "Image file" },
  { key: "contentType", type: "string", label: "Content type" },
  { key: "sizeBytes", type: "number", label: "Size in bytes" },
  { key: "svg", type: "string", label: "SVG markup (SVG output only)" },
  { key: "base64", type: "string", label: "Base64 (only when the host has no file store)" },
];

import type { HookContext } from "@w6w/types";

/** REST API root. Every authenticated call lives under `/api`. */
export const API_URL = "https://www.webmerge.me/api";

/**
 * The merge endpoints are NOT under `/api` — a document merges at
 * `https://www.webmerge.me/merge/<ID>/<KEY>` and a data route at
 * `.../route/<ID>/<KEY>`. Same host, different prefix.
 */
export const ORIGIN = "https://www.webmerge.me";

export type Query = Record<string, string | number | boolean | undefined | null>;

export interface RequestOptions {
  method?: string;
  query?: Query;
  body?: unknown;
}

/** A binary payload (merged document, converted PDF, ZIP) returned base64-encoded. */
export interface FileResult {
  file: { contentBase64: string; contentType: string; sizeBytes: number };
}

/** Drop `undefined`/`null`/`""` so an unset optional is never sent as an empty value. */
export function compact(obj: Record<string, unknown>): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(obj)) {
    if (v === undefined || v === null || v === "") continue;
    out[k] = v;
  }
  return out;
}

export function toBase64(bytes: Uint8Array): string {
  let bin = "";
  const chunk = 0x8000;
  for (let i = 0; i < bytes.length; i += chunk) {
    bin += String.fromCharCode(...bytes.subarray(i, i + chunk));
  }
  return btoa(bin);
}

/**
 * Read a response body that may be JSON **or** a file.
 *
 * WebMerge answers the same endpoint with either, depending on a flag — a merge
 * returns `{"success":1}` normally and the raw PDF bytes under `download=1`; a
 * route merge with `download=1` returns one PDF for a single document but a JSON
 * envelope of base64 files for two or more. The `Content-Type` is not a reliable
 * discriminator (the JSON envelope is not always labelled), so this sniffs the
 * first non-whitespace byte: `{` or `[` that parses is JSON, everything else
 * (`%PDF`, `PK`, ...) is a file.
 */
export async function readBody(res: Response): Promise<unknown> {
  const bytes = new Uint8Array(await res.arrayBuffer());
  if (bytes.length === 0) return null;
  const type = res.headers.get("content-type") ?? "application/octet-stream";
  let i = 0;
  while (i < bytes.length && (bytes[i] === 0x20 || bytes[i] === 0x0a || bytes[i] === 0x0d)) i++;
  if (bytes[i] === 0x7b || bytes[i] === 0x5b) {
    try {
      return JSON.parse(new TextDecoder().decode(bytes));
    } catch { /* not JSON after all — fall through to file */ }
  }
  const out: FileResult = {
    file: { contentBase64: toBase64(bytes), contentType: type, sizeBytes: bytes.length },
  };
  return out;
}

/**
 * Thin wrapper over `ctx.fetch` for the Formstack Documents (WebMerge) API.
 * Never sets Authorization — the runtime routes each request through the auth
 * `sign` hook, which adds HTTP Basic `<key>:<secret>`.
 *
 * Errors: a rejected credential answers a bare **401 with an empty body**, so
 * the status is the only signal there; other failures carry whatever text the
 * server sent, which is surfaced verbatim.
 */
export class WebMergeClient {
  constructor(private ctx: HookContext) {}

  /** Call an `/api/...` path. */
  request<T = unknown>(path: string, options: RequestOptions = {}): Promise<T> {
    return this.send<T>(`${API_URL}${path}`, options);
  }

  /** Call a path on the site root (the unauthenticated-by-design merge URLs). */
  requestRoot<T = unknown>(path: string, options: RequestOptions = {}): Promise<T> {
    return this.send<T>(`${ORIGIN}${path}`, options);
  }

  private async send<T>(href: string, options: RequestOptions): Promise<T> {
    const url = new URL(href);
    for (const [k, v] of Object.entries(options.query ?? {})) {
      if (v === undefined || v === null || v === "") continue;
      url.searchParams.set(k, String(v));
    }
    const method = options.method ?? "GET";
    const init: RequestInit = { method, headers: { accept: "application/json, */*" } };
    if (options.body !== undefined) {
      (init.headers as Record<string, string>)["content-type"] = "application/json";
      init.body = JSON.stringify(options.body);
    }
    const res = await this.ctx.fetch(url.toString(), init);
    if (!res.ok) {
      const detail = await res.text().catch(() => "");
      const hint = res.status === 401
        ? " (the API key/secret pair was rejected, or the document's merge key is wrong)"
        : "";
      throw new Error(
        `Formstack Documents ${res.status} ${res.statusText} for ${method} ${url.pathname}${hint}${
          detail ? `: ${detail.slice(0, 500)}` : ""
        }`,
      );
    }
    return await readBody(res) as T;
  }

  /** Look up a document's or route's merge key when the caller did not supply one. */
  async mergeKey(kind: "documents" | "routes", id: string): Promise<string> {
    const found = await this.request<{ key?: string }>(`/${kind}/${encodeURIComponent(id)}`);
    if (!found?.key) {
      throw new Error(`Formstack Documents ${kind}/${id} returned no merge key`);
    }
    return found.key;
  }
}

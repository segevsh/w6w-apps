import type { HookContext } from "@w6w/types";

/**
 * DeepL splits its API across two hosts by account tier — a Free-tier key
 * only ever works against `api-free.deepl.com`, a Pro key only against
 * `api.deepl.com`. The tier is encoded in the key itself: every Free API key
 * ends in the literal suffix `:fx` (e.g. `279a2e9d-...-e42a0:fx`); Pro keys
 * never carry it. This is documented DeepL behavior, not a guess — see
 * https://developers.deepl.com/docs/getting-started/auth (auth) — confirmed
 * 2026-08-01.
 */
export const PRO_URL = "https://api.deepl.com";
export const FREE_URL = "https://api-free.deepl.com";

/** Free-tier keys are the only ones carrying this suffix. */
export function isFreeKey(apiKey: string): boolean {
  return apiKey.endsWith(":fx");
}

/** Host for a raw key. Only code holding the raw credential may call this. */
export function hostForKey(apiKey: string): string {
  return isFreeKey(apiKey) ? FREE_URL : PRO_URL;
}

/**
 * Host for an already-connected credential, without ever seeing the raw key.
 *
 * Actions never receive the credential (only `sign` and `test` do — see
 * `build-a-w6w-app.md` invariant 5), so an action-layer client cannot inspect
 * a key's `:fx` suffix directly. Instead, the `api-key` auth method's
 * `afterConnect` hook — which *does* see the credential once, at connect time
 * — derives a non-secret `plan: "free" | "pro"` label into the Connection's
 * `display` metadata (`ctx.connection.display`, redacted, never the
 * credential). Every action and the `quota` health check read that label
 * through this function instead of the key.
 *
 * `sign` deliberately stays header-only (see `auth/api-key.ts`): the
 * alternative — having `sign` also rewrite `request.url` from the key's
 * suffix — would work (`SignableRequest.url` is mutable), but it would make
 * the one network-less, credential-isolated hook responsible for a piece of
 * routing logic every other hook already has a credential-free way to reach.
 * Keeping host selection in the client/action layer, sourced from
 * `afterConnect`'s output, keeps `sign` doing exactly one thing.
 *
 * Falls back to the Pro host when `display.plan` is absent (e.g. a
 * `ctx.connection` without display data yet) — Pro is the safer default: a
 * Free key pointed at the Pro host fails fast with an auth error, while a Pro
 * key pointed at the Free host would too, so neither default silently
 * misroutes a working credential.
 */
export function hostForConnection(display?: Record<string, unknown>): string {
  return display?.plan === "free" ? FREE_URL : PRO_URL;
}

export interface RequestOptions {
  method?: string;
  query?: Record<string, string | number | boolean | undefined | null>;
  body?: unknown;
  /** multipart/form-data body — used only by the document-upload call. */
  form?: FormData;
  /** Skip JSON parsing and return the raw `Response` (binary downloads). */
  raw?: boolean;
}

interface DeepLApiError {
  message?: string;
  detail?: string;
}

/**
 * Thin wrapper over `ctx.fetch`. Never sets Authorization — the runtime
 * routes every request through the auth `sign` hook, which injects the
 * `DeepL-Auth-Key` header. The base host is resolved once per client from the
 * connection's `plan` label (see `hostForConnection`).
 */
export class DeepLClient {
  private baseUrl: string;

  constructor(private ctx: HookContext) {
    this.baseUrl = hostForConnection(
      ctx.connection?.display as Record<string, unknown> | undefined,
    );
  }

  async request<T = unknown>(path: string, options: RequestOptions = {}): Promise<T> {
    const url = new URL(path.startsWith("http") ? path : `${this.baseUrl}${path}`);
    if (options.query) {
      for (const [k, v] of Object.entries(options.query)) {
        if (v === undefined || v === null || v === "") continue;
        url.searchParams.set(k, String(v));
      }
    }

    const init: RequestInit = { method: options.method ?? "GET" };
    if (options.form) {
      // `ctx.fetch` sets the multipart boundary itself from the FormData body.
      init.body = options.form;
    } else if (options.body !== undefined) {
      init.headers = { "content-type": "application/json" };
      init.body = JSON.stringify(options.body);
    }

    const res = await this.ctx.fetch(url.toString(), init);

    if (options.raw) {
      if (!res.ok) {
        throw new Error(
          `DeepL ${res.status} ${res.statusText} for ${init.method} ${url.pathname}`,
        );
      }
      return res as unknown as T;
    }

    if (!res.ok) {
      let detail = "";
      try {
        const body = await res.json() as DeepLApiError;
        detail = body.message ?? body.detail ?? "";
      } catch {
        try {
          detail = await res.text();
        } catch { /* ignore */ }
      }
      throw new Error(
        `DeepL ${res.status} ${res.statusText} for ${init.method} ${url.pathname}: ${detail}`,
      );
    }
    if (res.status === 204) return undefined as T;
    const contentType = res.headers.get("content-type") ?? "";
    if (contentType.includes("application/json")) {
      return res.json() as Promise<T>;
    }
    return res.text() as unknown as Promise<T>;
  }
}

/** base64 encode a byte array (no url-safe transformation). */
export function bytesToBase64(bytes: Uint8Array): string {
  let binary = "";
  for (const b of bytes) binary += String.fromCharCode(b);
  return btoa(binary);
}

/** Decode a bare base64 string or a `data:<mime>;base64,<payload>` URL. */
export function base64ToBytes(input: string): Uint8Array {
  const match = input.match(/^data:([^;]+);base64,(.*)$/s);
  const clean = match ? match[2] : input;
  return Uint8Array.from(atob(clean), (c) => c.charCodeAt(0));
}

/** MIME type from a `data:` URL, if the input carried one. */
export function dataUrlMime(input: string): string | undefined {
  return input.match(/^data:([^;]+);base64,/)?.[1];
}

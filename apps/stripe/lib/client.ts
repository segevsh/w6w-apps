import type { HookContext } from "@w6w/types";

export const API_URL = "https://api.stripe.com/v1";

/**
 * The Stripe API version this app targets. Stripe pins breaking changes to the
 * version header, so sending it keeps the app on a known contract rather than
 * whatever the account's default drifts to.
 */
export const API_VERSION = "2024-06-20";

export interface RequestOptions {
  method?: string;
  /** Form fields. Nested objects/arrays are flattened into Stripe's bracket syntax. */
  form?: Record<string, unknown>;
  query?: Record<string, unknown>;
  /**
   * Opt out of the Idempotency-Key header for a request that is naturally
   * idempotent anyway (a GET) or where retrying really should create a second
   * object.
   */
  idempotent?: boolean;
}

/**
 * Stripe does not accept JSON. Every write is
 * `application/x-www-form-urlencoded` with **bracket notation** for nesting:
 *
 *   { metadata: { plan: "pro" } }     -> metadata[plan]=pro
 *   { expand: ["customer"] }          -> expand[0]=customer
 *   { items: [{ price: "p1" }] }      -> items[0][price]=p1
 *
 * Unset values are dropped; `null` is kept as the empty string, which is how
 * Stripe unsets a field.
 */
export function encodeForm(obj: Record<string, unknown>, prefix = ""): string[] {
  const parts: string[] = [];
  for (const [rawKey, value] of Object.entries(obj)) {
    if (value === undefined) continue;
    const key = prefix ? `${prefix}[${rawKey}]` : rawKey;
    if (value === null) {
      // Stripe clears a field when it is sent empty.
      parts.push(`${encodeURIComponent(key)}=`);
    } else if (Array.isArray(value)) {
      value.forEach((item, i) => {
        if (item !== null && typeof item === "object") {
          parts.push(...encodeForm(item as Record<string, unknown>, `${key}[${i}]`));
        } else if (item !== undefined) {
          parts.push(`${encodeURIComponent(`${key}[${i}]`)}=${encodeURIComponent(String(item))}`);
        }
      });
    } else if (typeof value === "object") {
      parts.push(...encodeForm(value as Record<string, unknown>, key));
    } else {
      parts.push(`${encodeURIComponent(key)}=${encodeURIComponent(String(value))}`);
    }
  }
  return parts;
}

/** Treat a blank form field as absent. */
export function unset(v: string | undefined): string | undefined {
  return v === "" ? undefined : v;
}

/**
 * Parse the "Metadata" JSON param into the flat string map Stripe wants.
 * Returns undefined when empty so it is not sent at all.
 */
export function metadata(raw: unknown): Record<string, unknown> | undefined {
  if (raw === undefined || raw === null || raw === "") return undefined;
  const obj = typeof raw === "string" ? JSON.parse(raw) : raw;
  if (typeof obj !== "object" || Array.isArray(obj)) {
    throw new Error("`metadata` must be a JSON object of key -> value.");
  }
  return Object.keys(obj as object).length ? obj as Record<string, unknown> : undefined;
}

interface StripeError {
  error?: { message?: string; type?: string; code?: string; param?: string };
}

/**
 * Thin wrapper over `ctx.fetch`. It never sets Authorization — the runtime
 * routes every request through the auth `sign` hook.
 */
export class StripeClient {
  constructor(private ctx: HookContext) {}

  async request<T = unknown>(path: string, options: RequestOptions = {}): Promise<T> {
    const url = new URL(`${API_URL}${path}`);
    for (const part of encodeForm(options.query ?? {})) {
      const [k, v = ""] = part.split("=");
      url.searchParams.append(decodeURIComponent(k), decodeURIComponent(v));
    }

    const method = options.method ?? (options.form ? "POST" : "GET");
    const headers: Record<string, string> = { "stripe-version": API_VERSION };

    // Stripe deduplicates writes on this header for 24 hours, which is exactly
    // what `ctx.invocation.invocationId` is for: a retried invocation reuses the
    // key and Stripe replays the original response instead of charging twice.
    const invocationId = this.ctx.invocation?.invocationId;
    if (method !== "GET" && options.idempotent !== false && invocationId) {
      headers["idempotency-key"] = invocationId;
    }

    const init: RequestInit = { method, headers };
    if (options.form) {
      headers["content-type"] = "application/x-www-form-urlencoded";
      init.body = encodeForm(options.form).join("&");
    }

    const res = await this.ctx.fetch(url.toString(), init);
    const text = await res.text();
    if (!res.ok) {
      let detail = text;
      try {
        const parsed = JSON.parse(text) as StripeError;
        // Stripe's `param` names the offending field — the difference between
        // "invalid request" and "amount must be at least 50".
        detail = [parsed.error?.message, parsed.error?.param && `(param: ${parsed.error.param})`]
          .filter(Boolean).join(" ") || text;
      } catch { /* keep the raw body */ }
      throw new Error(`Stripe ${res.status} for ${method} ${url.pathname}: ${detail}`);
    }
    if (!text) return undefined as T;
    return JSON.parse(text) as T;
  }
}

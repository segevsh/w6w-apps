import type { HookContext } from "@w6w/types";

/**
 * Mandrill (Mailchimp Transactional) API v1.0 — `https://mandrillapp.com/api/1.0`.
 *
 * Every endpoint is `POST <resource>/<method>.json` with a **JSON request body**
 * (never query string, never a header) and every request carries the API key as
 * a `key` field in that same JSON body — verified against Mailchimp's own docs
 * (`mailchimp.com/developer/transactional/docs/fundamentals/`, fetched
 * 2026-08-02): "The API key parameter must be included in the JSON body of your
 * POST request." We never set `key` here: it is injected by the auth `sign`
 * hook (`../auth/api-key.ts`), exactly the way a header would be for a normal
 * API — see that file for why a body-located credential needs special handling.
 *
 * Errors are NOT surfaced via 4xx status codes. Mandrill returns HTTP 500 for
 * essentially every functional error (invalid key, validation failure, unknown
 * template, …) with a structured body `{ status: "error", code, name, message
 * }` — confirmed against multiple independent sources (Mandrill's own error
 * docs excerpts, the official Python/PHP client generators). `request()` below
 * treats any non-2xx as an error and surfaces `message` when the body parses.
 */
export const API_URL = "https://mandrillapp.com/api/1.0";

export interface MandrillErrorBody {
  status?: "error";
  code?: number;
  name?: string;
  message?: string;
}

/**
 * Thin wrapper over `ctx.fetch`. Builds the JSON body from `params` (never
 * including `key` — that is injected by the auth `sign` hook) and posts it to
 * `<API_URL><path>` (callers pass paths ending in `.json`, e.g.
 * `/users/ping.json`).
 */
export class MandrillClient {
  constructor(private ctx: HookContext) {}

  async request<T = unknown>(path: string, params: Record<string, unknown> = {}): Promise<T> {
    const res = await this.ctx.fetch(`${API_URL}${path}`, {
      method: "POST",
      headers: { "content-type": "application/json", accept: "application/json" },
      body: JSON.stringify(params),
    });

    const text = await res.text();
    if (!res.ok) {
      let detail = text;
      try {
        const err = JSON.parse(text) as MandrillErrorBody;
        detail = err.message ?? text;
      } catch {
        // Non-JSON error body — keep the raw text.
      }
      throw new Error(`Mandrill ${res.status} ${res.statusText} for POST ${path}: ${detail}`);
    }
    if (!text) return undefined as T;
    return JSON.parse(text) as T;
  }
}

export interface MandrillRecipient {
  email: string;
  name?: string;
  type?: "to" | "cc" | "bcc";
}

/**
 * Turn a comma-separated string ("a@x.com", "Ada <a@x.com>, Bo <b@x.com>") or
 * an array of `{email, name?}` into Mandrill's `{email, name?, type}` shape,
 * tagging every entry with `type` — Mandrill puts `to`/`cc`/`bcc` recipients
 * together in a single `message.to` array distinguished by this field, unlike
 * most transactional-email APIs which use three separate arrays.
 */
export function parseRecipients(
  input: Array<{ email: string; name?: string }> | string | undefined,
  type: "to" | "cc" | "bcc",
): MandrillRecipient[] {
  if (!input) return [];
  if (Array.isArray(input)) {
    return input.map((e) => ({ email: e.email, ...(e.name ? { name: e.name } : {}), type }));
  }
  return input
    .split(",")
    .map((raw) => raw.trim())
    .filter(Boolean)
    .map((raw) => {
      const match = raw.match(/^(.*?)\s*<([^>]+)>\s*$/);
      if (match) {
        const name = match[1].trim().replace(/^"|"$/g, "");
        const email = match[2].trim();
        return name ? { email, name, type } : { email, type };
      }
      return { email: raw, type };
    });
}

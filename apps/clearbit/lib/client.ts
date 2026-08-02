import type { HookContext } from "@w6w/types";

/**
 * Clearbit addresses each product family through its own subdomain rather
 * than one host with path prefixes: `person(-stream).clearbit.com`,
 * `company(-stream).clearbit.com`, `prospector.clearbit.com`,
 * `reveal.clearbit.com`, `risk.clearbit.com`, `autocomplete.clearbit.com`.
 * Confirmed live 2026-08-01 by probing every host below unauthenticated —
 * each returns a real `401 {"error":{"type":"auth_required",...}}` from
 * Clearbit's own edge (not a DNS failure or a generic 404), so the surface is
 * still up even though the product itself has been folded into HubSpot Breeze
 * Intelligence (see the app README for the acquisition timeline).
 *
 * The plain `person.clearbit.com` / `company.clearbit.com` hosts default to
 * **queued** delivery: a slow lookup can 202 and expect the caller to either
 * poll or receive a webhook. A stateless, single-shot `ctx.fetch` action has
 * no way to do either, so this app always addresses the `-stream` variant
 * instead — verified as the documented synchronous mode via the official
 * `clearbit-node` SDK's `stream: true` client option (`src/client.js`:
 * `ENDPOINT = 'https://%s%s.clearbit.com/v%s'`, `%s` = `-stream` when set) and
 * confirmed as real production usage by n8n's own Clearbit node, which calls
 * `person-stream` / `company-stream` for exactly this reason
 * (`packages/nodes-base/nodes/Clearbit/Clearbit.node.ts`).
 */
export const PERSON_HOST = "person-stream.clearbit.com";
export const COMPANY_HOST = "company-stream.clearbit.com";
/** Name→domain and Prospector/Reveal/Risk have no queued mode to avoid. */
export const COMPANY_LOOKUP_HOST = "company.clearbit.com";
export const PROSPECTOR_HOST = "prospector.clearbit.com";
export const REVEAL_HOST = "reveal.clearbit.com";
export const RISK_HOST = "risk.clearbit.com";
export const AUTOCOMPLETE_HOST = "autocomplete.clearbit.com";

/** Drop keys the caller left unset so a request doesn't send empty query params. */
export function compact(obj: Record<string, unknown>): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(obj)) {
    if (v !== undefined && v !== null && v !== "") out[k] = v;
  }
  return out;
}

function applyQuery(url: URL, query?: Record<string, unknown>): void {
  for (const [k, v] of Object.entries(query ?? {})) {
    if (v === undefined || v === null || v === "") continue;
    url.searchParams.set(k, String(v));
  }
}

/** Clearbit's error envelope: `{"error":{"type":"...","message":"..."}}`. */
async function readError(res: Response): Promise<string> {
  const text = await res.text().catch(() => "");
  try {
    const body = JSON.parse(text) as { error?: { type?: string; message?: string } };
    return body.error?.message ?? text;
  } catch {
    return text;
  }
}

/**
 * Thin wrapper over `ctx.fetch` for Clearbit's Basic-Auth'd JSON APIs. Never
 * sets Authorization — the runtime routes every request through the auth
 * `sign` hook, which stamps `Basic base64(apiKey:)` onto the request.
 */
export class ClearbitClient {
  constructor(private ctx: HookContext) {}

  async request<T = unknown>(
    host: string,
    path: string,
    options: { method?: string; query?: Record<string, unknown>; body?: unknown } = {},
  ): Promise<T> {
    const url = new URL(`https://${host}${path}`);
    applyQuery(url, options.query);

    const res = await this.ctx.fetch(url.toString(), {
      method: options.method ?? "GET",
      headers: {
        accept: "application/json",
        ...(options.body !== undefined ? { "content-type": "application/json" } : {}),
      },
      body: options.body !== undefined ? JSON.stringify(options.body) : undefined,
    });

    if (res.status === 404) {
      throw new Error(
        `Clearbit found no match (404) for ${options.method ?? "GET"} ${url.pathname}`,
      );
    }
    if (res.status === 202) {
      throw new Error(
        "Clearbit queued this lookup (202) instead of resolving it synchronously — retry shortly.",
      );
    }
    if (!res.ok) {
      throw new Error(
        `Clearbit ${res.status} ${res.statusText} for ${
          options.method ?? "GET"
        } ${url.pathname}: ${await readError(res)}`,
      );
    }
    const text = await res.text();
    if (!text) return undefined as T;
    return JSON.parse(text) as T;
  }
}

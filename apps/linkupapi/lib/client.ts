import type { HookContext } from "@w6w/types";

export const API_BASE = "https://api.linkupapi.com";
export const API_HOST = "api.linkupapi.com";

export interface RequestOptions {
  query?: Record<string, unknown>;
  body?: unknown;
}

/** The V2 envelope every response uses: `{success, data | error, metadata}`. */
export interface Envelope {
  success?: boolean;
  data?: unknown;
  error?: { code?: string; message?: string };
  metadata?: { credits_consumed?: number; action?: string };
}

/** What every action returns: the envelope's `data`, plus what the call cost. */
export interface ActionResult extends Record<string, unknown> {
  data: unknown;
  creditsConsumed: number | null;
}

export function truncate(text: string, max = 800): string {
  return text.length <= max ? text : `${text.slice(0, max)}… (${text.length} chars truncated)`;
}

export function encodeId(id: unknown, label = "id"): string {
  const v = String(id ?? "").trim();
  if (!v) throw new Error(`${label} is required`);
  return encodeURIComponent(v);
}

/** Drop undefined, null and empty-string entries; keep `false` and `0`. */
export function compact<T extends Record<string, unknown>>(obj: T): Partial<T> {
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(obj)) {
    if (v === undefined || v === null || v === "") continue;
    out[k] = v;
  }
  return out as Partial<T>;
}

/** The vendor's own error code, from the body. The status code alone is not trusted. */
export function parseEnvelope(raw: string): Envelope | undefined {
  try {
    const parsed = JSON.parse(raw);
    return parsed && typeof parsed === "object" ? parsed as Envelope : undefined;
  } catch {
    return undefined;
  }
}

const HINTS: Record<string, string> = {
  INVALID_API_KEY: "the API key is missing or invalid; reconnect this connection",
  INVALID_ACCOUNT:
    "the account_id does not exist or does not belong to this API key (List Accounts)",
  ACCOUNT_INACTIVE:
    "the account is inactive or its LinkedIn session expired; reconnect it in the " +
    "LinkupAPI dashboard",
  INVALID_ACTION: "the action is not supported on this endpoint",
  INVALID_PARAMS: "a parameter is missing or invalid, or the target no longer exists on LinkedIn",
  RATE_LIMITED: "LinkedIn or LinkupAPI rate-limited the call; back off and retry later",
  INSUFFICIENT_CREDITS: "the account is out of LinkupAPI credits; top up and retry",
  CHANNEL_ERROR: "the platform refused the request (restricted profile, missing premium seat, " +
    "upstream failure); retrying with the same input will not help",
  INTERNAL_ERROR: "LinkupAPI had an unexpected error; retry, then contact support if it persists",
};

export function formatError(status: number, method: string, path: string, raw: string): string {
  const env = parseEnvelope(raw);
  const code = env?.error?.code;
  const message = env?.error?.message ?? (env ? "" : raw.trim());
  const hint = code && HINTS[code] ? ` — ${HINTS[code]}` : "";
  return truncate(
    `LinkupAPI ${status}${code ? ` ${code}` : ""} for ${method} ${path}` +
      `${message ? `: ${message}` : ""}${hint}`,
    1000,
  );
}

export class LinkupApiClient {
  constructor(private ctx: HookContext) {}

  /** One HTTP call; returns the unwrapped result or throws the vendor's own error. */
  async request(
    method: string,
    path: string,
    opts: RequestOptions = {},
  ): Promise<ActionResult> {
    const url = new URL(`${API_BASE}${path}`);
    for (const [k, v] of Object.entries(opts.query ?? {})) {
      if (v !== undefined && v !== null && v !== "") url.searchParams.set(k, String(v));
    }
    const headers: Record<string, string> = { accept: "application/json" };
    const init: RequestInit = { method, headers };
    if (opts.body !== undefined) {
      headers["content-type"] = "application/json";
      init.body = JSON.stringify(opts.body);
    }
    const res = await this.ctx.fetch(url.toString(), init);
    const raw = await res.text();
    const env = parseEnvelope(raw);
    // Failure is read from the body (`success: false`), never from the status alone.
    if (!res.ok || env?.success === false) {
      throw new Error(formatError(res.status, method, path, raw));
    }
    if (!env) {
      throw new Error(
        `LinkupAPI ${method} ${path} answered ${res.status} with a body that is not JSON`,
      );
    }
    return { data: env.data ?? null, creditsConsumed: env.metadata?.credits_consumed ?? null };
  }

  /**
   * An action call: `POST /v2/{category}` with `{account_id, action, params}`. Enrichment
   * actions are not account-scoped, so `accountId` is optional and left out of the body.
   */
  async act(
    category: string,
    action: string,
    accountId: string | undefined,
    params: Record<string, unknown>,
  ): Promise<ActionResult> {
    let body: Record<string, unknown> = { action, params };
    if (accountId !== undefined) {
      const id = String(accountId).trim();
      if (!id) throw new Error("accountId is required");
      body = { account_id: id, action, params };
    }
    return await this.request("POST", `/v2/${category}`, { body });
  }
}

/**
 * CoinGecko API v3 client. Every action calls the DEMO host's origin; the auth
 * method's `sign` hook swaps it for the Pro host when the connection is a Pro
 * key, so no action needs to know which plan it is running under.
 */
import type { HookContext } from "@w6w/types";

export const BASE_URL = "https://api.coingecko.com/api/v3";
export const DEMO_ORIGIN = "https://api.coingecko.com";
export const PRO_ORIGIN = "https://pro-api.coingecko.com";

export type Plan = "demo" | "pro";

export const HEADER_BY_PLAN: Record<Plan, string> = {
  demo: "x-cg-demo-api-key",
  pro: "x-cg-pro-api-key",
};

export type Query = Record<string, string | number | boolean | undefined | null>;

/**
 * CoinGecko answers errors in three shapes: `{"error": "..."}` (422 validation),
 * `{"status": {"error_code", "error_message"}}` (auth/plan/rate limit) and the same
 * with `error_code` hoisted beside `status` (wrong-host 10010). Read all three.
 */
export function errorDetail(text: string): { code?: number; message: string } {
  if (!text) return { message: "empty response" };
  try {
    const body = JSON.parse(text) as {
      error?: unknown;
      error_code?: unknown;
      status?: { error_code?: unknown; error_message?: unknown } | unknown;
    };
    const status = body.status && typeof body.status === "object"
      ? body.status as { error_code?: unknown; error_message?: unknown }
      : undefined;
    const rawCode = status?.error_code ?? body.error_code;
    const code = typeof rawCode === "number" ? rawCode : undefined;
    const msg = status?.error_message ?? body.error;
    if (typeof msg === "string") return { code, message: msg };
    if (msg && typeof msg === "object") return { code, message: JSON.stringify(msg) };
  } catch {
    // not JSON — fall through to the raw text
  }
  return { message: text.slice(0, 300) };
}

/** A comma-list param: accepts an array or a comma string; returns a trimmed comma string. */
export function csv(v: unknown): string | undefined {
  const items = Array.isArray(v) ? v.map(String) : typeof v === "string" ? v.split(",") : [];
  const out = items.map((s) => s.trim()).filter(Boolean);
  return out.length ? out.join(",") : undefined;
}

export function str(v: unknown): string | undefined {
  if (v === undefined || v === null) return undefined;
  const s = String(v).trim();
  return s === "" ? undefined : s;
}

export function req(v: unknown, field: string): string {
  const s = str(v);
  if (!s) throw new Error(`\`${field}\` is required`);
  return s;
}

export function bool(v: unknown): boolean | undefined {
  if (v === undefined || v === null || v === "") return undefined;
  return v === true || v === "true";
}

export function num(v: unknown): number | undefined {
  if (v === undefined || v === null || v === "") return undefined;
  const n = Number(v);
  return Number.isFinite(n) ? n : undefined;
}

export class CoinGeckoClient {
  constructor(private ctx: HookContext) {}

  async get<T = unknown>(path: string, query: Query = {}): Promise<T> {
    const url = new URL(`${BASE_URL}${path}`);
    for (const [k, v] of Object.entries(query)) {
      if (v === undefined || v === null || v === "") continue;
      url.searchParams.set(k, String(v));
    }
    const res = await this.ctx.fetch(url.toString(), { headers: { accept: "application/json" } });
    const text = await res.text();
    if (!res.ok) {
      const { code, message } = errorDetail(text);
      throw new Error(
        `CoinGecko ${res.status}${code ? ` (error_code ${code})` : ""} for GET ${path}: ${message}`,
      );
    }
    if (!text) return undefined as T;
    return JSON.parse(text) as T;
  }
}

import type { AuthDefinition } from "@w6w/types";
import { API_BASE, API_PREFIX, errorText } from "../lib/client.ts";

/**
 * Baremetrics API key — `Authorization: Bearer <key>`.
 *
 * Verified 2026-10-06 against developers.baremetrics.com/reference/authentication
 * and a live unauthenticated probe of `api.baremetrics.com`. The docs also allow
 * an OAuth access token in the same header; this app takes the API key, found in
 * Baremetrics > Settings > API.
 *
 * The probe is `GET /v1/account`: it needs a credential, and its response is
 * the company name, default currency and creation time — no key material
 * (unlike a `/me` that echoes the caller's own key).
 *
 * Validity is decided from the response *body*, not the status code alone.
 * A bad key answers `401 {"error":"Unauthorized. API Key not found (001)"}`.
 */
export interface BaremetricsCredential {
  apiKey: string;
}

export const PROBE_PATH = "/account";

const apiKey: AuthDefinition = {
  key: "api-key",
  type: "bearer",
  displayName: "API Key",
  description: "Paste an API key from Baremetrics > Settings > API.",
  connectionLabel: "Baremetrics ({{company}})",
  fields: [
    {
      key: "apiKey",
      label: "API Key",
      type: "secret",
      required: true,
      hint: "Baremetrics > Settings > API. A production key; sandbox keys only work against " +
        "api-sandbox.baremetrics.com, which this app does not call.",
    },
  ],

  sign({ request, credential }) {
    const { apiKey } = credential as Partial<BaremetricsCredential>;
    request.headers["authorization"] = `Bearer ${apiKey ?? ""}`;
    return request;
  },

  async test({ credential }, ctx) {
    const key = ((credential as Partial<BaremetricsCredential>)?.apiKey ?? "").trim();
    if (!key) return { ok: false, message: "credential missing apiKey" };

    const res = await ctx.fetch(`${API_BASE}${API_PREFIX}${PROBE_PATH}`, {
      headers: { accept: "application/json", authorization: `Bearer ${key}` },
    });
    const body = await res.json().catch(() => null) as
      | { account?: unknown; error?: unknown }
      | null;

    // The documented success shape — not merely a 2xx.
    if (res.ok && body && typeof body === "object" && "account" in body) return { ok: true };

    const text = errorText(body) ?? "";
    if (/unauthorized|api key not found|token not found/i.test(text) || res.status === 401) {
      return {
        ok: false,
        message: `Baremetrics rejected the API key (HTTP ${res.status}${
          text ? ` — ${text}` : ""
        }). Check it was copied exactly from Settings > API.`,
      };
    }
    if (res.ok) {
      return { ok: false, message: "Baremetrics answered without an account object" };
    }
    return { ok: false, message: `Baremetrics returned HTTP ${res.status} for ${PROBE_PATH}` };
  },

  /** Label the connection with the company name — nothing else is kept. */
  async afterConnect({ credential }, ctx) {
    const key = ((credential as Partial<BaremetricsCredential>)?.apiKey ?? "").trim();
    try {
      const res = await ctx.fetch(`${API_BASE}${API_PREFIX}${PROBE_PATH}`, {
        headers: { accept: "application/json", authorization: `Bearer ${key}` },
      });
      if (!res.ok) return {};
      const body = await res.json() as { account?: { company?: string } };
      const company = body?.account?.company;
      return company ? { company } : {};
    } catch {
      return {};
    }
  },
};

export default apiKey;

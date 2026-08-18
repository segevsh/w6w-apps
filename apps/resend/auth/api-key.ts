import type { AuthDefinition } from "@w6w/types";
import { API_URL } from "../lib/client.ts";

/**
 * API Key (`apiKey`, bearer) — a key minted at Resend → API Keys.
 *
 * Verified against Resend's own OpenAPI document
 * (https://resend.com/openapi.json, v1.5.0, fetched 2026-08-18): the only
 * security scheme is `bearerAuth`, `{"type":"http","scheme":"bearer"}`, and
 * Resend's API reference states the header as
 * `Authorization: Bearer re_xxxxxxxxx`.
 *
 * Resend keys carry a permission — **Full access** or **Sending access** — and
 * may be restricted to a single domain. A sending-only key can post to
 * `/emails` but cannot read `/domains`, which is why the liveness probe below
 * is chosen the way it is.
 */
const apiKey: AuthDefinition = {
  key: "api-key",
  type: "apiKey",
  displayName: "API Key",
  description: "Paste a key from Resend → API Keys. Sent as `Authorization: Bearer re_…`. A " +
    "sending-only key can send email but cannot manage domains, audiences or contacts.",
  apiKey: { in: "header", name: "Authorization", prefix: "Bearer " },
  fields: [
    {
      key: "apiKey",
      label: "API Key",
      type: "secret",
      required: true,
      placeholder: "re_…",
      hint: "Resend → API Keys → Create API Key. Full access is needed for anything beyond " +
        "sending.",
    },
  ],

  sign({ request, credential }) {
    const { apiKey } = credential as { apiKey: string };
    request.headers["authorization"] = `Bearer ${apiKey}`;
    return request;
  },

  async test({ credential }, ctx) {
    const { apiKey } = credential as { apiKey?: string };
    if (!apiKey) return { ok: false, message: "credential missing apiKey" };

    // `GET /emails?limit=1` is the probe that works for BOTH permission levels:
    // it is in the sending key's own scope, so a valid sending-only key passes
    // rather than being reported as broken. A domains or api-keys read would
    // 401/403 for exactly the keys most connections use.
    const res = await ctx.fetch(`${API_URL}/emails?limit=1`, {
      headers: { authorization: `Bearer ${apiKey}`, accept: "application/json" },
    });
    if (res.status === 401) {
      // Resend's own body for a bad or absent key is
      // `{"statusCode":401,"message":"Missing API Key","name":"missing_api_key"}`
      // — verified live 2026-08-18 against an unauthenticated call.
      return { ok: false, message: "Resend rejected the key (401)" };
    }
    if (res.status === 403) {
      return { ok: false, message: "the key lacks permission for this account (403)" };
    }
    if (!res.ok) return { ok: false, message: `Resend returned ${res.status}` };
    return { ok: true };
  },
};

export default apiKey;

import type { AuthDefinition } from "@w6w/types";
import { describeLegacy, LEGACY_BASE, type LegacyResponse } from "../lib/client.ts";

/**
 * A Google Maps Platform API key.
 *
 * ## It has to travel in the query string
 *
 * The generation-2 hosts (Places, Routes, Address Validation, Roads) accept an
 * `X-Goog-Api-Key` header. The generation-1 web services on
 * `maps.googleapis.com` do **not** — probed live on 2026-08-18, a header-only
 * geocode answers *"You must use an API key to authenticate each request to
 * Google Maps Platform APIs"*. The only form that works across the whole
 * surface is `?key=`, so that is what this signs with, and it is why the key
 * appears in request URLs rather than in a header.
 *
 * ## Two restrictions that decide whether this key works at all
 *
 * **Application restriction.** A key restricted to *HTTP referrers* — the
 * default a web developer reaches for — cannot be used from a server. There is
 * no referrer to send, and every call comes back `REQUEST_DENIED`. A server
 * integration needs an **IP restriction**, or none.
 *
 * **API restriction.** A key can be limited to a list of APIs, and separately,
 * each API must be **enabled on the Cloud project**. These are two different
 * switches with the same symptom: `REQUEST_DENIED` from the API you have not
 * turned on, while every other call keeps working. That is why the `apis`
 * health check probes several of them rather than trusting one.
 *
 * The connection test below geocodes a fixed, famous address. It proves the key
 * is real and that the **Geocoding API** in particular is on — and it says so
 * in exactly those words, because it cannot prove anything about Places or
 * Routes.
 */
const apiKey: AuthDefinition = {
  key: "api-key",
  type: "apiKey",
  displayName: "API Key",
  description:
    "A Maps Platform API key from the Cloud console. It travels as `?key=`, because the older " +
    "web services accept nothing else. A key restricted to HTTP referrers will NOT work " +
    "server-side — use an IP restriction, or none.",
  connectionLabel: "Google Maps Platform",
  apiKey: { in: "query", name: "key" },
  fields: [
    {
      key: "apiKey",
      label: "API Key",
      type: "secret",
      required: true,
      hint: "Cloud console → APIs & Services → Credentials → Create credentials → API key. " +
        "Under Application restrictions choose None or IP addresses — never HTTP referrers for " +
        "server use.",
    },
  ],

  sign({ request, credential }) {
    const { apiKey } = credential as { apiKey: string };
    const url = new URL(request.url);
    // Google takes it here on both API generations; the header only works on one.
    url.searchParams.set("key", apiKey);
    request.url = url.toString();
    return request;
  },

  /**
   * Geocode a fixed landmark. Cheap, deterministic, and it needs no scope
   * beyond the Geocoding API being enabled.
   *
   * The web services answer HTTP 200 for a refused key, so this reads the body
   * `status` and never `res.ok`.
   */
  async test({ credential }, ctx) {
    const { apiKey } = credential as { apiKey?: string };
    if (!apiKey) return { ok: false, message: "credential missing the API key" };

    const url = new URL(`${LEGACY_BASE}/geocode/json`);
    url.searchParams.set("address", "1600 Amphitheatre Parkway, Mountain View, CA");
    url.searchParams.set("key", apiKey);

    let res: Response;
    try {
      res = await ctx.fetch(url.toString(), { headers: { accept: "application/json" } });
    } catch (err) {
      return { ok: false, message: `could not reach Google: ${String(err)}` };
    }
    const text = await res.text().catch(() => "");
    if (!res.ok) return { ok: false, message: `Google returned HTTP ${res.status}` };

    let body: LegacyResponse | null = null;
    try {
      body = JSON.parse(text) as LegacyResponse;
    } catch {
      return { ok: false, message: "Google did not return JSON" };
    }

    if (body?.status !== "OK") {
      return { ok: false, message: describeLegacy(body, "Geocoding API") };
    }
    return {
      ok: true,
      message: "the key works for the Geocoding API — each other Maps API is enabled separately, " +
        "so the `apis` health check is what tells you which of the rest are on",
    };
  },
};

export default apiKey;

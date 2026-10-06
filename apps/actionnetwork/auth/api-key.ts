import type { AuthDefinition } from "@w6w/types";
import { API_URL, redact } from "../lib/client.ts";

/**
 * API key — Action Network sends the key as an `OSDI-API-Token` header. Keys belong to one list:
 * a user's personal list or a group the user administers, and API access is a partner feature.
 * A group key reaches tags, taggings and the group's own pages; a personal key does not.
 */
const apiKey: AuthDefinition = {
  key: "api-key",
  type: "apiKey",
  displayName: "API Key",
  description:
    "Generate a key at actionnetwork.org → Start Organizing → API & Sync. Choose the list first: a group you administer (needed for tags and most organizing data) or your personal list. API access is a partner feature and keys are issued on request.",
  apiKey: { in: "header", name: "OSDI-API-Token" },
  fields: [
    {
      key: "apiKey",
      label: "API Key",
      type: "secret",
      required: true,
      hint:
        "Start Organizing → API & Sync. Revoking a key on that page is instant and irreversible.",
    },
  ],

  sign({ request, credential }) {
    const { apiKey: key } = credential as { apiKey: string };
    request.headers["osdi-api-token"] = key;
    return request;
  },

  /**
   * Probe: `GET /people?per_page=1`, which works for both personal and group keys (tags would
   * refuse a personal one). The AEP (`GET /`) is public and answers 200 for ANY key, so it proves
   * nothing. The verdict is read from the BODY, not the status: a rejected key is `{"error":"API Key
   * invalid or not present <the key>"}` — the vendor echoes the key back, so no part of an error
   * body is ever surfaced.
   */
  async test({ credential }, ctx) {
    const { apiKey: key } = credential as { apiKey?: string };
    if (!key) return { ok: false, message: "credential missing apiKey" };

    let res: Response;
    try {
      res = await ctx.fetch(`${API_URL}/people?per_page=1`, {
        headers: { "osdi-api-token": key, accept: "application/hal+json" },
      });
    } catch (e) {
      return { ok: false, message: `could not reach Action Network: ${redact(String(e))}` };
    }

    const raw = await res.text().catch(() => "");
    let body: { error?: unknown; per_page?: unknown; _links?: { self?: unknown } } | null = null;
    try {
      body = raw ? JSON.parse(raw) : null;
    } catch { /* non-JSON: the request probably never reached the API */ }

    if (res.ok) {
      return typeof body?.per_page === "number" && body._links?.self ? { ok: true } : {
        ok: false,
        message: `unexpected ${res.status} body from GET /people — not a people collection`,
      };
    }
    const err = typeof body?.error === "string" ? body.error : "";
    if (/API Key invalid or not present/i.test(err)) {
      return {
        ok: false,
        message: "Action Network rejected the API key (invalid, revoked or not sent)",
      };
    }
    if (res.status >= 500) {
      return { ok: false, message: `Action Network is erroring (${res.status})` };
    }
    return {
      ok: false,
      message: `Action Network returned ${res.status}${
        err ? `: ${redact(err).slice(0, 120)}` : ""
      }`,
    };
  },
};

export default apiKey;

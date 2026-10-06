import type { AuthDefinition } from "@w6w/types";
import { API_BASE, errorText } from "../lib/client.ts";

/**
 * Uscreen Publisher API key — `Authorization: <key>` (no `Bearer`/`Token` prefix).
 *
 * Verified 2026-10-06: the Swagger document's only security scheme is
 * `authorization` (`apiKey`, `in: header`, `name: Authorization`), and live probes on
 * `uscreen.io/publisher_api/v1` answer a missing key with
 * `401 {"message":"Missing private API key"}` and a wrong one with
 * `401 {"message":"Invalid private API key"}`. Prefixing the key with `Bearer ` makes it
 * a wrong key, so the raw value is sent.
 *
 * ## The probe
 *
 * `GET /email_topics` — the store's marketing-email topics (at most 10 small rows, no
 * customer PII, never the key). It is judged on the response BODY: a JSON array is a pass;
 * the vendor's `{"message":"Invalid private API key"}` is a rejected key; anything else is
 * reported with the vendor's own text. The status code is only a hint.
 */
export interface UscreenCredential {
  apiKey?: string;
}

export const PROBE_PATH = "/email_topics";

const apiKey: AuthDefinition = {
  key: "api-key",
  type: "apiKey",
  displayName: "Publisher API Key",
  apiKey: { in: "header", name: "Authorization" },
  description: "A Uscreen Publisher API key. In Uscreen: Settings > Integrations > API (owner " +
    "access required). The key is store-wide and grants full publisher access.",
  fields: [
    {
      key: "apiKey",
      label: "API Key",
      type: "secret",
      required: true,
      hint: "Sent verbatim as the Authorization header, with no Bearer prefix.",
    },
  ],

  sign({ request, credential }) {
    const { apiKey: key } = credential as UscreenCredential;
    request.headers["authorization"] = (key ?? "").trim();
    return request;
  },

  async test({ credential }, ctx) {
    const key = (credential as UscreenCredential).apiKey?.trim();
    if (!key) return { ok: false, message: "credential missing apiKey" };

    const res = await ctx.fetch(`${API_BASE}${PROBE_PATH}`, {
      headers: { accept: "application/json", authorization: key },
    });
    const text = await res.text().catch(() => "");
    let body: unknown = null;
    try {
      body = JSON.parse(text);
    } catch { /* handled below */ }

    if (Array.isArray(body)) return { ok: true };
    const message = errorText(body);
    if (message) return { ok: false, message: `Uscreen rejected the key: ${message}` };
    return {
      ok: false,
      message:
        `Uscreen answered HTTP ${res.status} with an unexpected body — not the Publisher API.`,
    };
  },
};

export default apiKey;

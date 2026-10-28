import type { AuthDefinition } from "@w6w/types";
import { API_URL, type MandrillErrorBody } from "../lib/client.ts";

/**
 * API Key (`apiKey`, body-located) — the only auth mode Mandrill supports.
 *
 * The user pastes a key minted at mandrillapp.com → Settings → SMTP & API
 * Info. Every request carries it as a `key` field in the **JSON request
 * body** — never an `Authorization` header, never a query parameter.
 * Verified against Mailchimp's own docs (`mailchimp.com/developer/
 * transactional/docs/fundamentals/`, fetched 2026-08-02): "The API key
 * parameter must be included in the JSON body of your POST request."
 *
 * `apiKey: { in: "body", name: "key" }` records that location declaratively
 * for `describe()`/UI purposes — `ApiKeyConfig.in` supports `"body"` alongside
 * `"header"`/`"query"` (see `@w6w/types` `auth.ts`). As with every Auth method
 * in this pack, the `type`/`apiKey` fields are metadata only: the runtime
 * never auto-signs from them, so `sign` below does the actual work by hand.
 *
 * ## Why this needs special handling
 *
 * A JSON-body key has nowhere to go in `SignableRequest.headers` — it has to
 * be merged into `SignableRequest.body`, which is a plain `string | null` (the
 * wire bytes, not a parsed structure — see `hooks.ts`). So `sign` parses the
 * action's already-built JSON body (or `{}` when the action sends no fields of
 * its own), sets `key` on top of whatever the action already put there
 * (actions never set it themselves), and re-serializes.
 */
const apiKey: AuthDefinition = {
  key: "api-key",
  type: "apiKey",
  displayName: "API Key",
  description:
    "Paste an API key from mandrillapp.com → Settings → SMTP & API Info. Sent as a `key` field in the JSON request body.",
  apiKey: { in: "body", name: "key" },
  fields: [
    {
      key: "apiKey",
      label: "API Key",
      type: "secret",
      required: true,
      hint: "mandrillapp.com → Settings → SMTP & API Info → New API Key.",
    },
  ],

  sign({ request, credential }) {
    const { apiKey } = credential as { apiKey: string };
    let payload: Record<string, unknown> = {};
    if (request.body) {
      try {
        payload = JSON.parse(request.body) as Record<string, unknown>;
      } catch {
        payload = {};
      }
    }
    payload.key = apiKey;
    request.body = JSON.stringify(payload);
    request.headers["content-type"] = "application/json";
    return request;
  },

  async test({ credential }, ctx) {
    const { apiKey } = credential as { apiKey?: string };
    if (!apiKey) return { ok: false, message: "credential missing apiKey" };
    const res = await ctx.fetch(`${API_URL}/users/ping.json`, {
      method: "POST",
      headers: { "content-type": "application/json", accept: "application/json" },
      body: JSON.stringify({ key: apiKey }),
    });
    if (!res.ok) {
      const body = await res.json().catch(() => null) as MandrillErrorBody | null;
      return { ok: false, message: body?.message ?? `Mandrill returned HTTP ${res.status}` };
    }
    return { ok: true };
  },
};

export default apiKey;

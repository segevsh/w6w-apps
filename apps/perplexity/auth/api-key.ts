import type { AuthDefinition } from "@w6w/types";
import { API_URL, extractError } from "../lib/client.ts";

/**
 * Perplexity API key (`bearer`). Mint one at
 * https://www.perplexity.ai/account/api/keys and paste it here. Every request
 * signs with `Authorization: Bearer <key>`.
 *
 * ## Probe: `GET /v1/models`
 *
 * The OpenAPI spec (fetched 2026-08-16 from `https://docs.perplexity.ai/openapi.json`)
 * declares this route `security: []` — publicly documented as needing no
 * credential. The live API disagrees: an unauthenticated request and a bogus
 * bearer token both come back `401 application/json`
 * `{"error":{"message":"Invalid API key provided...","type":"invalid_api_key","code":401}}`
 * (measured 2026-08-16), identical in shape to every other endpoint's rejection.
 * Trust the wire over the spec — this is a real, working credential probe.
 *
 * It also needs no scope beyond a valid key: the endpoint lists the model
 * catalog for the Agent API (`POST /v1/agent`), not anything gated by what the
 * key can call, and its response is `{object, data: [{id, object, created,
 * owned_by}]}` — no credential material to leak.
 */
const apiKey: AuthDefinition = {
  key: "api-key",
  type: "bearer",
  displayName: "API Key",
  description: "Paste an API key minted at https://www.perplexity.ai/account/api/keys.",
  fields: [
    {
      key: "apiKey",
      label: "API Key",
      type: "secret",
      required: true,
      hint: "Perplexity account > API > API Keys > Generate.",
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

    const res = await ctx.fetch(`${API_URL}/v1/models`, {
      headers: { authorization: `Bearer ${apiKey}` },
    });
    if (res.ok) return { ok: true };
    return { ok: false, message: `Perplexity returned ${res.status}: ${await extractError(res)}` };
  },
};

export default apiKey;

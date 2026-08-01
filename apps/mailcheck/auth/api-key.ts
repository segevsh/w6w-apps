import type { AuthDefinition } from "@w6w/types";
import { API_URL } from "../lib/client.ts";

/**
 * Mailcheck API key — a JWT minted in the dashboard's API section
 * (https://app.mailcheck.co) and sent as a standard Bearer token. Confirmed
 * against the vendor's live OpenAPI document (`securitySchemes["API key"]`:
 * `{ type: "http", scheme: "bearer", bearerFormat: "JWT" }` at
 * https://app.mailcheck.co/openapi.json) and against `api.mailcheck.co`
 * itself, which rejects an unauthenticated request with
 * `JWT validation failed: Missing or invalid credentials`.
 */
const apiKey: AuthDefinition = {
  key: "api-key",
  type: "bearer",
  displayName: "API Key",
  description: "Paste an API key minted in the API section of your Mailcheck dashboard.",
  fields: [
    {
      key: "apiKey",
      label: "API Key",
      type: "secret",
      required: true,
      hint: "Mailcheck dashboard → API → Create new key. See https://mailcheck.co/create-api-key.",
    },
  ],

  sign({ request, credential }) {
    const { apiKey } = credential as { apiKey: string };
    request.headers["authorization"] = `Bearer ${apiKey}`;
    return request;
  },

  // Probes the operations list — the only documented endpoint that reads
  // rather than spends a verification credit, so credential liveness can be
  // checked for free.
  async test({ credential }, ctx) {
    const { apiKey } = credential as { apiKey: string };
    const res = await ctx.fetch(`${API_URL}/v1/emails/operations?page_size=1`, {
      headers: { authorization: `Bearer ${apiKey}` },
    });
    if (!res.ok) return { ok: false, message: `Mailcheck returned ${res.status}` };
    return { ok: true };
  },
};

export default apiKey;

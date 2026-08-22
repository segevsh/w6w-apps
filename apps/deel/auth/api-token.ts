import type { AuthDefinition } from "@w6w/types";
import { PRODUCTION, SANDBOX } from "../lib/client.ts";

/**
 * API Token (`apiKey`, bearer) — a Deel access token.
 *
 * Verified against the security scheme in Deel's own OpenAPI documents:
 * `deelToken` is `{"type":"http","scheme":"bearer"}`, and its description says
 * "The Deel API uses bearer tokens to authenticate requests. All API calls must
 * be made over HTTPS — calls over plain HTTP or without authentication will
 * fail."
 *
 * **Environment is a field, not a guess.** Deel's documents name two servers:
 * `api.letsdeel.com` (production) and `api-staging.letsdeel.com` (the demo
 * environment). Tokens are not shared between them, and pointing a production
 * token at the sandbox fails confusingly — so the Connection says which one it
 * is, and the client builds URLs from that.
 */
const apiToken: AuthDefinition = {
  key: "api-token",
  type: "apiKey",
  displayName: "API Token",
  description:
    "Paste a token from Deel → Developer → API tokens (or an OAuth app's access token). " +
    "Sent as `Authorization: Bearer <token>`.",
  apiKey: { in: "header", name: "Authorization", prefix: "Bearer " },
  fields: [
    {
      key: "apiToken",
      label: "API Token",
      type: "secret",
      required: true,
      hint: "Deel → Developer → API tokens. Scope it to what your workflows need.",
    },
    {
      key: "environment",
      label: "Environment",
      type: "select",
      default: "production",
      options: [
        { value: "production", label: "Production (api.letsdeel.com)" },
        { value: "sandbox", label: "Demo / sandbox (api-staging.letsdeel.com)" },
      ],
      hint: "Tokens are not shared between the two.",
    },
  ],

  sign({ request, credential }) {
    const { apiToken } = credential as { apiToken: string };
    request.headers["authorization"] = `Bearer ${apiToken}`;
    return request;
  },

  async test({ credential }, ctx) {
    const { apiToken, environment } = credential as {
      apiToken?: string;
      environment?: string;
    };
    if (!apiToken) return { ok: false, message: "credential missing apiToken" };
    const base = environment === "sandbox" ? SANDBOX : PRODUCTION;

    // `GET /contracts?limit=1` is the cheapest call that proves the token can
    // actually read this organization's data. Deel has no whoami endpoint in
    // the documents this app is built from, and `/organizations` needs a
    // broader scope than most tokens are issued with.
    const res = await ctx.fetch(`${base}/contracts?limit=1`, {
      headers: { authorization: `Bearer ${apiToken}`, accept: "application/json" },
    });
    if (res.status === 401) {
      // Deel's own body for a missing or bad token, verified live 2026-08-18:
      // `{"request":{…,"status":401,…},"errors":[{"message":"Unauthorized call: …"}]}`
      return { ok: false, message: "Deel rejected the token (401)" };
    }
    if (res.status === 403) {
      return { ok: false, message: "the token lacks the scope to read contracts (403)" };
    }
    if (!res.ok) return { ok: false, message: `Deel returned ${res.status}` };
    return { ok: true };
  },

  /** Records which environment the client should build URLs against. */
  afterConnect({ credential }) {
    const { environment } = credential as { environment?: string };
    return { environment: environment === "sandbox" ? "sandbox" : "production" };
  },
};

export default apiToken;

import type { AuthDefinition } from "@w6w/types";
import { API_URL } from "../lib/client.ts";

/**
 * API key as a bearer token — what the spec's only security scheme declares
 * (`type: http`, `scheme: bearer`), and what the live host expects. Measured
 * 2026-08-18, an unauthenticated `GET /api/v1/api-key` answers
 * `401 {"success":false,"message":"Invalid API key","error":"Invalid API key"}`.
 *
 * Loops has one key per workspace, created in the app. There is no OAuth, no
 * per-user token and no scope selection — which is worth stating rather than
 * leaving someone hunting for a narrower credential that does not exist.
 */
const apiKey: AuthDefinition = {
  key: "api-key",
  type: "bearer",
  displayName: "API Key",
  description:
    "A Loops API key from Settings → API. Sent as a bearer token. Loops issues one key per " +
    "workspace — there is no OAuth flow and no scoped key.",
  connectionLabel: "{{teamName}}",
  fields: [
    {
      key: "apiKey",
      label: "API Key",
      type: "secret",
      required: true,
      hint: "Loops → Settings → API.",
    },
  ],

  sign({ request, credential }) {
    const { apiKey } = credential as { apiKey: string };
    request.headers["authorization"] = `Bearer ${apiKey}`;
    return request;
  },

  /**
   * `GET /v1/api-key` is Loops' own key-test endpoint — it exists for exactly
   * this and returns the workspace the key belongs to, which is what
   * `afterConnect` labels the connection with.
   */
  async test({ credential }, ctx) {
    const { apiKey } = credential as { apiKey?: string };
    if (!apiKey) return { ok: false, message: "credential missing apiKey" };

    const res = await ctx.fetch(`${API_URL}/api-key`, {
      headers: { authorization: `Bearer ${apiKey}`, accept: "application/json" },
    });
    if (res.status === 401) return { ok: false, message: "Loops rejected the API key (401)" };
    if (!res.ok) return { ok: false, message: `Loops returned ${res.status}` };
    return { ok: true };
  },

  /** Publishes the workspace the key belongs to. Never the key. */
  async afterConnect(_input, ctx) {
    const { credential } = _input as { credential: { apiKey?: string } };
    if (!credential.apiKey) return {};
    try {
      const res = await ctx.fetch(`${API_URL}/api-key`, {
        headers: { authorization: `Bearer ${credential.apiKey}`, accept: "application/json" },
      });
      if (!res.ok) return {};
      const body = await res.json() as { teamName?: string; success?: boolean };
      return { teamName: body.teamName };
    } catch {
      return {};
    }
  },
};

export default apiKey;

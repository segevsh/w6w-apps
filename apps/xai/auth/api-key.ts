import type { AuthDefinition } from "@w6w/types";
import { API_URL, type XaiError } from "../lib/client.ts";

/**
 * Classify a `GET /v1/models` reply from its BODY, not its status code. Measured against the
 * live API on 2026-10-06: no credential → 401 `{"code":"unauthenticated:no-credentials"}`, a
 * wrong key → **400** `{"code":"invalid-argument","error":"Incorrect API key provided..."}`.
 * A status-only check would have called the second a malformed request, not a bad credential.
 */
export function classify(body: unknown): { ok: boolean; message?: string } {
  const b = (body ?? {}) as XaiError & { data?: unknown };
  if (Array.isArray(b.data)) return { ok: true };
  const code = b.code ?? "";
  const text = b.error ?? "";
  if (code.startsWith("unauthenticated") || /api key|credential/i.test(text)) {
    return { ok: false, message: `xAI rejected the API key (${code || "no code"}): ${text}` };
  }
  return { ok: false, message: `unexpected xAI reply${code ? ` [${code}]` : ""}: ${text}` };
}

/**
 * xAI API key (`bearer`). Create one at https://console.x.ai → API Keys. Every request signs
 * with `Authorization: Bearer <key>`.
 *
 * `test` probes `GET /v1/models` — scope-free, and its body lists models only. `/v1/api-key`
 * is deliberately not used: it describes the key itself.
 */
const apiKey: AuthDefinition = {
  key: "api-key",
  type: "bearer",
  displayName: "API Key",
  description: "Paste an API key created at https://console.x.ai.",
  fields: [
    {
      key: "apiKey",
      label: "API Key",
      type: "secret",
      required: true,
      hint: "xAI Console → API Keys → Create API key.",
    },
  ],

  sign({ request, credential }) {
    const { apiKey } = credential as { apiKey: string };
    request.headers["authorization"] = `Bearer ${apiKey}`;
    return request;
  },

  async test({ credential }, ctx) {
    const { apiKey } = credential as { apiKey: string };
    const res = await ctx.fetch(`${API_URL}/v1/models`, {
      headers: { authorization: `Bearer ${apiKey}` },
    });
    const body = await res.json().catch(() => null);
    return classify(body);
  },
};

export default apiKey;

import type { AuthDefinition } from "@w6w/types";
import { API_URL } from "../lib/client.ts";

/**
 * API key — the only auth path the Gemini Developer API exposes. Mint a key at
 * Google AI Studio (https://aistudio.google.com/apikey) and paste it here.
 *
 * Sent as the `x-goog-api-key` header, not `?key=` — a credential in a query
 * string ends up in access logs and `Referer` headers, and the API docs
 * confirm the header is fully equivalent (verified live 2026-08-16: an
 * identical `API_KEY_INVALID` error body comes back for a bad key on either
 * form).
 */
const apiKey: AuthDefinition = {
  key: "api-key",
  type: "apiKey",
  displayName: "API Key",
  description: "Paste a key from https://aistudio.google.com/apikey.",
  apiKey: { in: "header", name: "x-goog-api-key" },
  fields: [
    {
      key: "apiKey",
      label: "API Key",
      type: "secret",
      required: true,
      hint: "Google AI Studio → Get API key.",
    },
  ],

  sign({ request, credential }) {
    const { apiKey } = credential as { apiKey: string };
    request.headers["x-goog-api-key"] = apiKey;
    return request;
  },

  // `/v1beta/models` needs no scope beyond a live key, and its response
  // carries no credential material to echo back. Read the vendor's own error
  // body (`error.status` / `error.message`) rather than trusting the bare
  // status code — Google's own docs show 400 INVALID_ARGUMENT
  // (`API_KEY_INVALID`) for a bad key and 403 PERMISSION_DENIED for a missing
  // one, and the message is worth surfacing either way.
  async test({ credential }, ctx) {
    const { apiKey } = credential as { apiKey?: string };
    if (!apiKey) return { ok: false, message: "credential missing apiKey" };
    const res = await ctx.fetch(`${API_URL}/models`, {
      headers: { "x-goog-api-key": apiKey },
    });
    if (res.ok) return { ok: true };

    const body = await res.json().catch(() => undefined) as
      | { error?: { status?: string; message?: string } }
      | undefined;
    return {
      ok: false,
      message: body?.error?.message ?? `Gemini returned ${res.status}`,
    };
  },
};

export default apiKey;

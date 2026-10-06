import type { AuthDefinition } from "@w6w/types";
import { baseUrl } from "../lib/client.ts";

/**
 * API key (`basic`).
 *
 * Quaderno's scheme is HTTP Basic with the API key as the username and a
 * BLANK password (`curl -u <key>:`), verified against the OpenAPI spec's
 * "API features → Authentication" section. Keys live under Developers → API
 * keys in the Quaderno app.
 *
 * The account name is the host (`<account>.quadernoapp.com`), so it is a
 * Connection field. `afterConnect` echoes it onto the connection's display
 * data, which is where the client reads it from.
 *
 * `test` calls `GET /ping`, which the spec documents as the way to verify
 * credentials. Its body is `{ "status": "..." }` — it never echoes the key. A
 * rejection is `{ "error": "Wrong API key or the user does not exist." }`;
 * the verdict is read from the body, with the status code only as a hint.
 */
const apiKey: AuthDefinition = {
  key: "api-key",
  type: "basic",
  displayName: "API Key",
  description: "Create an API key under Developers → API keys in your Quaderno account.",
  connectionLabel: "{{account}}",
  fields: [
    {
      key: "account",
      label: "Account name",
      type: "string",
      required: true,
      placeholder: "acme",
      hint: "The subdomain of `acme.quadernoapp.com` — not the full URL.",
      validation: { pattern: "^[a-zA-Z0-9-]+$" },
    },
    {
      key: "apiKey",
      label: "API Key",
      type: "secret",
      required: true,
      hint: "Developers → API keys.",
    },
  ],

  sign({ request, credential }) {
    const { apiKey } = credential as { apiKey: string };
    // Basic auth: the API key as the username, an empty password.
    request.headers["authorization"] = `Basic ${btoa(`${apiKey}:`)}`;
    return request;
  },

  async test({ credential }, ctx) {
    const { account, apiKey } = credential as { account?: string; apiKey?: string };
    if (!account || !apiKey) {
      return { ok: false, message: "credential missing account or apiKey" };
    }
    const res = await ctx.fetch(`${baseUrl(account)}/ping`, {
      headers: { authorization: `Basic ${btoa(`${apiKey}:`)}`, accept: "application/json" },
    });
    const body = await res.json().catch(() => null) as
      | { status?: unknown; error?: unknown }
      | null;
    if (body && typeof body.status === "string" && res.ok) return { ok: true };
    if (body && typeof body.error === "string") return { ok: false, message: body.error };
    return { ok: false, message: `Quaderno returned an unrecognised response (${res.status})` };
  },

  /** Records the account on the connection so the client can build URLs. */
  afterConnect({ credential }) {
    const { account } = credential as { account?: string };
    return account ? { account } : {};
  },
};

export default apiKey;

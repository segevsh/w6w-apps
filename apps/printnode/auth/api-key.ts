import type { AuthDefinition } from "@w6w/types";
import { API_BASE, formatError, isErrorBody } from "../lib/client.ts";

/**
 * PrintNode API key — HTTP Basic, key as the username, password EMPTY.
 *
 * Verified against the reference's Authentication section and live: an
 * unsigned request answers `401 {"code":"BadRequest","message":"HTTP basic auth
 * header ('Authorization') missing"}`, a bogus key `401 … "API Key not found"`.
 * The wire value is `base64("<key>:")` — the trailing colon is part of it.
 *
 * `type: "basic"` plus an explicit `sign`, because `apiKey` config cannot
 * express "base64 the value with a `:` appended". The (empty) password is not a
 * field: the user has no such secret.
 *
 * Any API key on the account works, and keys can be described and revoked
 * individually in the PrintNode dashboard, so a dedicated key per connection is
 * the recommended setup.
 */
export interface PrintNodeCredential {
  apiKey: string;
}

/** Inlined base64 — the sandbox cannot import `@std/encoding` at runtime. */
function encodeBase64(input: string): string {
  const bytes = new TextEncoder().encode(input);
  let s = "";
  for (const b of bytes) s += String.fromCharCode(b);
  return btoa(s);
}

/** The one place the wire format is built; `sign` and `test` share it. */
export function authHeaders(credential: Partial<PrintNodeCredential>): Record<string, string> {
  return { authorization: `Basic ${encodeBase64(`${credential.apiKey ?? ""}:`)}` };
}

/**
 * The credential probe: `GET /noop`.
 *
 * The reference describes it as "check your credentials but do nothing else":
 * `200` with the JSON-encoded Request-Id (a bare string) when the key is valid,
 * `401` otherwise. It is chosen over `GET /whoami` because whoami returns the
 * account holder's name, email and sub-account details — personal data a health
 * probe has no reason to copy. (Whoami does NOT echo the API key; that was
 * checked, it is just not needed.) Both require a credential, so a connection
 * whose key never got attached cannot pass.
 */
export const PROBE_PATH = "/noop";

const apiKey: AuthDefinition = {
  key: "api-key",
  type: "basic",
  displayName: "API Key",
  description:
    "Create an API key in the PrintNode dashboard under Account > API. Any key on the account " +
    "works; use one dedicated to this connection so it can be revoked on its own.",
  connectionLabel: "PrintNode ({{email}})",
  fields: [
    {
      key: "apiKey",
      label: "API Key",
      type: "secret",
      required: true,
      hint: "PrintNode dashboard > Account > API Keys.",
    },
  ],

  sign({ request, credential }) {
    for (const [name, value] of Object.entries(authHeaders(credential as PrintNodeCredential))) {
      request.headers[name] = value;
    }
    return request;
  },

  async test({ credential }, ctx) {
    const cred = credential as Partial<PrintNodeCredential>;
    const key = (cred?.apiKey ?? "").trim();
    if (!key) return { ok: false, message: "credential missing apiKey" };

    const res = await ctx.fetch(`${API_BASE}${PROBE_PATH}`, {
      headers: { accept: "application/json", ...authHeaders({ apiKey: key }) },
    });
    const text = await res.text().catch(() => "");
    let body: unknown;
    try {
      body = JSON.parse(text);
    } catch {
      body = undefined;
    }

    // Success is judged from the body: a bare JSON string (the Request-Id).
    if (res.ok && typeof body === "string" && body.length > 0) return { ok: true };

    if (isErrorBody(body)) {
      const msg = body.message ?? "";
      if (/api key not found/i.test(msg)) {
        return {
          ok: false,
          message: "PrintNode does not recognise this API key. Check it was copied exactly and " +
            "has not been deleted under Account > API Keys.",
        };
      }
      if (/missing/i.test(msg)) {
        return {
          ok: false,
          message: "PrintNode received no credentials. The key did not reach the request — " +
            "reconnect this connection.",
        };
      }
      return { ok: false, message: formatError(res.status, text) };
    }
    return {
      ok: false,
      message: `Unexpected response from PrintNode ${PROBE_PATH} (HTTP ${res.status})`,
    };
  },

  /** Publish the account email for the connection label; nothing else is kept. */
  async afterConnect({ credential }, ctx) {
    try {
      const res = await ctx.fetch(`${API_BASE}/whoami`, {
        headers: {
          accept: "application/json",
          ...authHeaders(credential as Partial<PrintNodeCredential>),
        },
      });
      if (!res.ok) return {};
      const body = await res.json() as { id?: number; email?: string };
      const out: Record<string, unknown> = {};
      if (body?.email) out.email = body.email;
      if (body?.id !== undefined) out.accountId = body.id;
      return out;
    } catch {
      return {};
    }
  },
};

export default apiKey;

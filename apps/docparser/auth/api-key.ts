import type { AuthDefinition } from "@w6w/types";
import { API_BASE } from "../lib/client.ts";

export interface DocparserCredential {
  apiKey: string;
}

/**
 * The probe: `GET /v1/ping`, documented answer `{"msg":"pong"}`. It needs no scope and the
 * body carries no credential. An invalid key answers HTTP 403 `{"error":"api key not valid"}`
 * (measured 2026-10-06); the verdict is read from that body text, not the status.
 */
export const PROBE_PATH = "/v1/ping";

/**
 * Docparser accepts the key as HTTP Basic (username = key), as an `api_key` header, a post
 * field or a query parameter. The header form is used: it is documented, it keeps the key out
 * of URLs, and unlike Basic it needs no encoding step.
 */
export function authHeaders(credential: Partial<DocparserCredential>): Record<string, string> {
  return { api_key: credential.apiKey ?? "" };
}

const apiKey: AuthDefinition = {
  key: "api-key",
  type: "apiKey",
  displayName: "API Key",
  description:
    "Paste your secret API key from Docparser: app.docparser.com > Account > API Settings " +
    "(app.docparser.com/myaccount/api). The key grants access to every parser on the account.",
  apiKey: { in: "header", name: "api_key" },
  fields: [
    {
      key: "apiKey",
      label: "Secret API Key",
      type: "secret",
      required: true,
      hint: "Docparser > Account > API Settings. Resetting the key there invalidates this one.",
    },
  ],

  sign({ request, credential }) {
    for (
      const [name, value] of Object.entries(authHeaders(credential as Partial<DocparserCredential>))
    ) {
      request.headers[name] = value;
    }
    return request;
  },

  async test({ credential }, ctx) {
    const key = ((credential as Partial<DocparserCredential>)?.apiKey ?? "").trim();
    if (!key) return { ok: false, message: "credential missing apiKey" };

    const res = await ctx.fetch(`${API_BASE}${PROBE_PATH}`, {
      headers: { accept: "application/json", ...authHeaders({ apiKey: key }) },
    });
    const raw = await res.text().catch(() => "");
    let body: { msg?: string; error?: string } | null = null;
    try {
      body = JSON.parse(raw);
    } catch { /* not JSON */ }

    if (body?.msg === "pong") return { ok: true };
    if (typeof body?.error === "string" && /api key/i.test(body.error)) {
      return {
        ok: false,
        message: `Docparser rejected the API key (${body.error}). Copy it again from ` +
          "Account > API Settings; resetting it there revokes the old one.",
      };
    }
    return {
      ok: false,
      message: `Docparser did not answer ${PROBE_PATH} with {"msg":"pong"} (HTTP ${res.status})` +
        (typeof body?.error === "string" ? `: ${body.error}` : ""),
    };
  },
};

export default apiKey;

import type { AuthDefinition } from "@w6w/types";
import { API_BASE, API_PREFIX, isPerspectiveError } from "../lib/client.ts";

/**
 * Perspective API key — `x-perspective-api-key: <key>`, no prefix.
 *
 * Verified against developers.perspective.co/getting-started/authentication
 * and live probes on 2026-10-06. The key is created in Perspective under
 * Account Settings and is company-wide; there is no OAuth for the REST API
 * (OAuth belongs to the MCP server, which this app does not use).
 *
 * ## The probe
 *
 * `GET /v1/workspaces` — "a convenient first call to verify that your key
 * works" per the vendor, it requires a key, and it returns only ids, names and
 * campaign status, so no credential material. There is no whoami endpoint.
 *
 * ## Classified by body, not status
 *
 * A missing key and a wrong key are both 401 and differ only in the JSON
 * `error` text (`API key is required` vs `Invalid or unauthorized API key`,
 * both observed live). The text separates "the credential never reached the
 * request" from "the key was refused". A 403 means the key authenticated but
 * lacks the workspaces permission, so the key is live and the connection is
 * accepted: a key scoped to CRM only must not read as broken.
 */
export interface PerspectiveCredential {
  apiKey: string;
}

export const HEADER = "x-perspective-api-key";
export const PROBE_PATH = "/workspaces";

const apiKey: AuthDefinition = {
  key: "api-key",
  type: "apiKey",
  displayName: "API Key",
  description: "Create a key in Perspective under Account Settings.",
  connectionLabel: "Perspective",
  apiKey: { in: "header", name: HEADER },
  fields: [
    {
      key: "apiKey",
      label: "API Key",
      type: "secret",
      required: true,
      hint: "Perspective > Account Settings > API keys. Keep it server-side; rotate by " +
        "regenerating it there.",
    },
  ],

  /** The only hook handed the raw credential; network-less. */
  sign({ request, credential }) {
    const { apiKey } = credential as Partial<PerspectiveCredential>;
    request.headers[HEADER] = apiKey ?? "";
    return request;
  },

  async test({ credential }, ctx) {
    const key = ((credential as Partial<PerspectiveCredential>)?.apiKey ?? "").trim();
    if (!key) return { ok: false, message: "credential missing apiKey" };

    const res = await ctx.fetch(`${API_BASE}${API_PREFIX}${PROBE_PATH}`, {
      headers: { accept: "application/json", [HEADER]: key },
    });
    const body = await res.json().catch(() => null) as unknown;

    if (res.ok) {
      const data = (body as { data?: unknown } | null)?.data;
      return Array.isArray(data)
        ? { ok: true }
        : { ok: false, message: `Perspective answered HTTP ${res.status} without a data array` };
    }
    const text = isPerspectiveError(body) ? body.error : undefined;
    if (res.status === 403) return { ok: true };
    if (res.status === 401) {
      if (text && /required/i.test(text)) {
        return {
          ok: false,
          message: "Perspective received no API key. The credential did not reach the request; " +
            "reconnect this connection.",
        };
      }
      return {
        ok: false,
        message: `Perspective rejected the API key${text ? ` (${text})` : ""}. Check it was ` +
          "copied exactly and has not been regenerated in Account Settings.",
      };
    }
    return {
      ok: false,
      message: text
        ? `Perspective ${res.status}: ${text}`
        : `Perspective returned HTTP ${res.status}`,
    };
  },
};

export default apiKey;

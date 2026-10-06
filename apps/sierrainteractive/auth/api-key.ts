import type { AuthDefinition } from "@w6w/types";
import { API_BASE, failureOf, isEnvelope, parseJson } from "../lib/client.ts";

/**
 * Sierra API key — `Sierra-User-ApiKey: <key>`.
 *
 * Verified against the Swagger document's `securityDefinitions` (`type: apiKey`,
 * `in: header`, `name: Sierra-User-ApiKey`) on 2026-10-06.
 *
 * ## The probe is `GET /zapier/validateAPIKey`
 *
 * The one endpoint Sierra built to answer "is this key good?". Measured unauthenticated and with
 * a bad key on 2026-10-06: **HTTP 400** `{"success":false,"errorMessage":"Unauthorized request"}`
 * (not 401 — and a missing route is a 404 with the same envelope). So the verdict comes from the
 * BODY. The result is reduced to ok/message here; the response body is never surfaced.
 */

export const PROBE_PATH = "/zapier/validateAPIKey";

export interface SierraCredential {
  apiKey: string;
}

export function authHeaders(credential: Partial<SierraCredential>): Record<string, string> {
  return { "sierra-user-apikey": credential.apiKey ?? "" };
}

const apiKey: AuthDefinition = {
  key: "api-key",
  type: "apiKey",
  displayName: "API Key",
  description: "A Sierra Interactive API key. Ask Sierra support or your account manager to " +
    "enable API access and issue a key for your site.",
  apiKey: { in: "header", name: "Sierra-User-ApiKey" },
  fields: [
    {
      key: "apiKey",
      label: "API Key",
      type: "secret",
      required: true,
      hint: "Sent as the Sierra-User-ApiKey header. The key acts as its owning Sierra user.",
    },
  ],

  /** The only hook handed the raw credential; network-less. */
  sign({ request, credential }) {
    for (
      const [name, value] of Object.entries(authHeaders(credential as Partial<SierraCredential>))
    ) {
      request.headers[name] = value;
    }
    return request;
  },

  async test({ credential }, ctx) {
    const key = ((credential as Partial<SierraCredential>)?.apiKey ?? "").trim();
    if (!key) return { ok: false, message: "credential missing apiKey" };

    const res = await ctx.fetch(`${API_BASE}${PROBE_PATH}`, {
      headers: { accept: "application/json", ...authHeaders({ apiKey: key }) },
    });
    const text = await res.text().catch(() => "");
    const body = parseJson(text);
    const failure = failureOf(res.status, text);

    if (failure === undefined && res.ok) {
      if (!isEnvelope(body)) {
        return {
          ok: false,
          message: "Sierra answered 200 but not with its documented JSON envelope; the " +
            "response is not the documented shape.",
        };
      }
      return { ok: true };
    }
    if (/unauthori[sz]ed/i.test(failure ?? "")) {
      return {
        ok: false,
        message: `Sierra rejected the API key (HTTP ${res.status}: ${failure}). Check it was ` +
          "copied exactly and that API access is enabled for the account.",
      };
    }
    return {
      ok: false,
      message: `Sierra returned HTTP ${res.status} for ${PROBE_PATH}${
        failure ? `: ${failure}` : ""
      }`,
    };
  },
};

export default apiKey;

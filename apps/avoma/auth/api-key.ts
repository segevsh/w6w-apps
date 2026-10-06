import type { AuthDefinition } from "@w6w/types";
import { API_BASE, errorText } from "../lib/client.ts";

/**
 * Avoma API key — `Authorization: Bearer <key>`.
 *
 * Spec: `components.securitySchemes.bearerAuth` (`type: http`, `scheme: bearer`). Avoma does
 * not issue keys self-serve in the API docs: the intro says to follow the "Avoma API
 * Integration guide" (help.avoma.com/api-integration-for-avoma) or ask help@avoma.com. The
 * guide yields a Client Key and Client Secret (the pair Zapier needs); the HTTP API itself
 * only takes the single bearer value.
 *
 * ## The probe is `GET /v1/users/`
 *
 * Chosen by the response body, not the name. It needs no query parameters (meetings, notes,
 * calls and transcriptions all REQUIRE `from_date`/`to_date`), and its schema is user
 * directory data — `uuid`, `role`, `user.email`, `user.first_name`, … — nothing that echoes
 * the caller's key.
 *
 * Verdicts come from the body's `detail`, with the status as a hint (measured 2026-10-06):
 *
 *   - no header  -> 401 `{"detail":"Auth missing in header and cookie"}`: the credential
 *     never reached the request;
 *   - bad token  -> 401 `{"detail":"Invalid Token"}`: the key was rejected.
 */

export interface AvomaCredential {
  apiKey: string;
}

export const PROBE_PATH = "/v1/users/";

const apiKey: AuthDefinition = {
  key: "api-key",
  type: "bearer",
  displayName: "API Key",
  description:
    "Paste the API key Avoma issued for your organization (Avoma API Integration guide, or ask " +
    "help@avoma.com). It acts for the whole organization.",
  connectionLabel: "Avoma",
  fields: [
    {
      key: "apiKey",
      label: "API Key",
      type: "secret",
      required: true,
      hint: "The bearer token from Avoma's API Integration guide (help.avoma.com).",
    },
  ],

  /** The only hook handed the raw credential; network-less — stamps the header and returns. */
  sign({ request, credential }) {
    const { apiKey } = credential as Partial<AvomaCredential>;
    request.headers["authorization"] = `Bearer ${apiKey ?? ""}`;
    return request;
  },

  async test({ credential }, ctx) {
    const key = ((credential as Partial<AvomaCredential>)?.apiKey ?? "").trim();
    if (!key) return { ok: false, message: "credential missing apiKey" };

    // `sign` only auto-applies to action traffic, so the header is built by hand here.
    const res = await ctx.fetch(`${API_BASE}${PROBE_PATH}`, {
      headers: { accept: "application/json", authorization: `Bearer ${key}` },
    });
    if (res.ok) return { ok: true };

    const detail = errorText(await res.json().catch(() => null));
    if (/auth missing/i.test(detail ?? "")) {
      return {
        ok: false,
        message: "Avoma received no credential. It did not reach the request — reconnect.",
      };
    }
    if (/invalid token/i.test(detail ?? "") || res.status === 401) {
      return {
        ok: false,
        message: `Avoma rejected the API key (${res.status}${detail ? ` ${detail}` : ""}). ` +
          "Check it was copied exactly and has not been revoked.",
      };
    }
    if (res.status === 403) {
      return {
        ok: false,
        message: `Avoma refused the users read (403${detail ? `: ${detail}` : ""})`,
      };
    }
    return { ok: false, message: `Avoma returned HTTP ${res.status} for ${PROBE_PATH}` };
  },
};

export default apiKey;

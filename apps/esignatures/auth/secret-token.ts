import type { AuthDefinition } from "@w6w/types";
import { API_BASE, API_PREFIX, errorParts } from "../lib/client.ts";

/**
 * Secret Token over HTTP Basic: the token is the **username**, the password is empty.
 *
 * Verified against https://esignatures.com/docs/api ("Basics") and live probes on 2026-10-06.
 * The vendor documents a second form, `?token=<secret>` in the query string. It is deliberately
 * not used: a workflow host logs request URLs, not request headers.
 *
 * ## Why `type: "basic"` and not `type: "apiKey"`
 *
 * `ApiKeyConfig` cannot say "base64 the value with a trailing colon", so `apiKey` would describe a
 * wire format this app does not use. The empty password is not a field: the user has none.
 *
 * ## Credential probe
 *
 * `GET /api/templates` — a plain list: cheap, needs no id, and (unlike a whoami) its body does not
 * echo the credential. Measured:
 *
 *   GET /api/templates  (no auth / bogus token) -> 403
 *     {"status":"error","data":{"error_code":"forbidden","error_message":"Invalid or missing Secret token"}}
 *
 * A bad token is **403, not 401**, and "missing" and "invalid" return a byte-identical body, so a
 * status code cannot tell "the credential did not reach the request" from "the credential is
 * wrong". `test` therefore classifies from the vendor's `error_code` and reports both causes.
 * Success is judged by the documented shape (`data` is an array), not by an HTTP 200.
 */
export interface ESignaturesCredential {
  secretToken: string;
}

export function basicHeader(token: string): string {
  return `Basic ${btoa(`${token}:`)}`;
}

export const PROBE_PATH = "/templates";

const secretToken: AuthDefinition = {
  key: "secret-token",
  type: "basic",
  displayName: "Secret Token",
  description: "The Secret Token from the API page of your eSignatures.com account. Sent as HTTP " +
    "Basic with the token as the username and an empty password.",
  connectionLabel: "eSignatures",
  fields: [
    {
      key: "secretToken",
      label: "Secret Token",
      type: "secret",
      required: true,
      hint: "Log in to eSignatures.com and open the API page. Use a token from a dedicated " +
        "test account while building: test contracts are free and stamped as a demo.",
    },
  ],

  sign({ request, credential }) {
    const { secretToken } = credential as Partial<ESignaturesCredential>;
    request.headers["authorization"] = basicHeader(secretToken ?? "");
    return request;
  },

  async test({ credential }, ctx) {
    const token = ((credential as Partial<ESignaturesCredential>)?.secretToken ?? "").trim();
    if (!token) return { ok: false, message: "credential missing secretToken" };

    const res = await ctx.fetch(`${API_BASE}${API_PREFIX}${PROBE_PATH}`, {
      headers: { accept: "application/json", authorization: basicHeader(token) },
    });
    const body = await res.json().catch(() => null) as
      | { data?: unknown; status?: string }
      | null;
    const { code, message } = errorParts(body);

    if (res.ok && Array.isArray(body?.data)) return { ok: true };
    if (code === "forbidden" || res.status === 403 || res.status === 401) {
      return {
        ok: false,
        message: "eSignatures rejected the Secret Token" +
          `${code ? ` (${res.status} ${code})` : ` (${res.status})`}. Its answer is identical ` +
          "for a wrong token and for none at all, so check the token was copied exactly from " +
          "the API page, then reconnect.",
      };
    }
    if (code) {
      return { ok: false, message: `eSignatures answered ${res.status} ${code}: ${message ?? ""}` };
    }
    return {
      ok: false,
      message: `eSignatures returned an unexpected response (HTTP ${res.status})`,
    };
  },
};

export default secretToken;

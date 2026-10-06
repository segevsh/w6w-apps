import type { AuthDefinition } from "@w6w/types";
import { API_BASE, errorCode, errorText, INGEST_HOST } from "../lib/client.ts";

/**
 * Encharge account API key — `X-Encharge-Token: <key>`.
 *
 * Verified 2026-10-06 against docs.encharge.io (Transactional Email API: "Authenticate by
 * passing an API key in the `token` query parameter or the `X-Encharge-Token` header") and live
 * probes of `api.encharge.io`. The key is the account API key shown at
 * app.encharge.io/account/info; it is sent as a HEADER, never the `token` query parameter, so it
 * stays out of URLs and logs.
 *
 * The Ingest API (`ingest.encharge.io`) uses the same header name but a different secret, the
 * account's WRITE KEY. `sign` picks the secret by the request's host, so the write key is only
 * ever sent to the ingest host and the API key only to the REST host. The write key is
 * optional: without it, the Track Event action fails with Encharge's own
 * "Missing Encharge write key." and nothing else is affected.
 *
 * ## The probe is `GET /people` for a throwaway address
 *
 * `GET /people` is one of the endpoints the OpenAPI document marks as API-key authenticated,
 * and the answer for an address that is not in the account carries no key material (the
 * account's own `/accounts/info` is marked OAuth-only, so it is not used). Validity is decided
 * from the response BODY:
 *
 *   - 200 with a `users` array: the key works.
 *   - an auth failure is recognised by its text (`Token without payload (should be JWT token)`,
 *     errorCode 10082, `User not logged in: Unauthorized request`) or by a 401/403.
 *   - a 404 carrying Encharge's `{"error": {"message"}}` envelope whose text is not an auth
 *     failure means the request got past authentication ("no such person"): accepted.
 *   - anything else (an HTML shell, a 5xx, an unrecognised 2xx) is not judged a valid key.
 */
export interface EnchargeCredential {
  apiKey: string;
  writeKey?: string;
}

export const PROBE_EMAIL = "w6w-connection-test@example.invalid";
export const PROBE_PATH = `/people?people%5B0%5D%5Bemail%5D=${encodeURIComponent(PROBE_EMAIL)}`;

/** The one place the wire format is built, shared by `sign` and `test`. */
export function tokenFor(
  credential: Partial<EnchargeCredential> | undefined,
  host: string,
): string {
  const raw = host === INGEST_HOST ? credential?.writeKey : credential?.apiKey;
  return (raw ?? "").trim();
}

const AUTH_TEXT = /token|jwt|not logged in|unauthori[sz]ed|no authentication|api key|forbidden/i;

/** True when the body/status says "this credential was refused" rather than "this call failed". */
export function isAuthFailure(status: number, body: unknown): boolean {
  if (status === 401 || status === 403) return true;
  if (errorCode(body) === 10082) return true;
  return AUTH_TEXT.test(errorText(body) ?? "");
}

const apiKey: AuthDefinition = {
  key: "api-key",
  type: "apiKey",
  displayName: "API Key",
  description: "Paste your Encharge account API key (and, to send events, the write key) from " +
    "Account > Account Info.",
  connectionLabel: "Encharge",
  apiKey: { in: "header", name: "X-Encharge-Token" },
  fields: [
    {
      key: "apiKey",
      label: "API Key",
      type: "secret",
      required: true,
      hint: "app.encharge.io > Account > Account Info > API Key. Used for every action except " +
        "Track Event.",
    },
    {
      key: "writeKey",
      label: "Write Key (Ingest API)",
      type: "secret",
      hint: "Optional. The Ingest API write key from the same page. Only the Track Event " +
        "action needs it, and it is only ever sent to ingest.encharge.io.",
    },
  ],

  /** The only hook handed the raw credential; network-less, it stamps the header by host. */
  sign({ request, credential }) {
    let host = "";
    try {
      host = new URL(request.url).hostname;
    } catch {
      // an unparsable URL gets the API key, never the write key
    }
    request.headers["x-encharge-token"] = tokenFor(credential as Partial<EnchargeCredential>, host);
    return request;
  },

  async test({ credential }, ctx) {
    const cred = credential as Partial<EnchargeCredential>;
    const key = tokenFor(cred, "");
    if (!key) return { ok: false, message: "credential missing apiKey" };

    // `sign` only auto-applies to action traffic, so the header is built by hand here.
    const res = await ctx.fetch(`${API_BASE}${PROBE_PATH}`, {
      headers: { accept: "application/json", "x-encharge-token": key },
    });
    const body = await res.json().catch(() => null) as Record<string, unknown> | null;
    const msg = errorText(body);

    if (res.ok) {
      if (body && Array.isArray(body.users)) return { ok: true };
      return {
        ok: false,
        message: `Encharge answered ${res.status} but not with a people list — not judged a ` +
          "valid key.",
      };
    }
    if (isAuthFailure(res.status, body)) {
      return {
        ok: false,
        message: `Encharge refused the API key (HTTP ${res.status}${msg ? ` — ${msg}` : ""}). ` +
          "Copy the API Key from Account > Account Info.",
      };
    }
    if (res.status === 404 && msg) return { ok: true };
    return {
      ok: false,
      message: `Encharge returned HTTP ${res.status}${msg ? ` (${msg})` : ""} for the probe; ` +
        "the key was not judged.",
    };
  },
};

export default apiKey;

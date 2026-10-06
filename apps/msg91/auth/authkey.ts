import type { AuthDefinition } from "@w6w/types";
import { API_BASE, errorMessage, isAuthRejection, isFailureBody } from "../lib/client.ts";

/**
 * MSG91 auth key — sent as the `authkey` request header (never in a URL).
 *
 * The reference shows the same value as a header on every endpoint (and, on a few legacy-style
 * ones such as OTP retry, also as a query parameter). The header is used everywhere so the key
 * never lands in a URL, a log line or a proxy's access log. Keys live in the MSG91 dashboard
 * under the account menu > Authkey.
 *
 * ## The probe
 *
 * `GET /otp/verify?otp=0000&mobile=910000000000`: a verification of a number that was never
 * sent an OTP. It needs no template, DLT registration or WhatsApp/email product (so a working
 * SMS-only key is not reported broken), changes nothing, and its body never carries the key.
 * Measured with no key and with a garbage key on 2026-10-06: HTTP **200**
 * `{"message":"Invalid authkey","type":"error","code":"201"}` — the status says nothing, the
 * body decides. `test` therefore passes only when the body is JSON and is NOT that rejection
 * (code `201` or the vendor's "Invalid authkey" / "Auth Key missing" wording). The body a
 * VALID key produces for an unknown number could not be measured without a key; any other
 * JSON envelope is treated as the credential having been accepted.
 */
export const PROBE_PATH = "/otp/verify";
export const PROBE_QUERY = "otp=0000&mobile=910000000000";

export interface Msg91Credential {
  authkey: string;
}

export function authHeaders(credential: Partial<Msg91Credential>): Record<string, string> {
  return { authkey: credential.authkey ?? "" };
}

const authkey: AuthDefinition = {
  key: "authkey",
  type: "apiKey",
  displayName: "Auth Key",
  description: "A MSG91 account auth key, sent as the `authkey` header.",
  connectionLabel: "MSG91",
  apiKey: { in: "header", name: "authkey" },
  fields: [
    {
      key: "authkey",
      label: "Auth Key",
      type: "secret",
      required: true,
      hint: "From the MSG91 dashboard (account menu > Authkey). If IP whitelisting is enabled " +
        "on the account, w6w's egress address must be allowed.",
    },
  ],

  sign({ request, credential }) {
    request.headers["authkey"] = authHeaders(credential as Partial<Msg91Credential>).authkey;
    return request;
  },

  async test({ credential }, ctx) {
    const key = ((credential as Partial<Msg91Credential>)?.authkey ?? "").trim();
    if (!key) return { ok: false, message: "credential missing authkey" };

    const res = await ctx.fetch(`${API_BASE}${PROBE_PATH}?${PROBE_QUERY}`, {
      headers: { accept: "application/json", ...authHeaders({ authkey: key }) },
    });
    const text = await res.text();
    let body: unknown = null;
    try {
      body = JSON.parse(text);
    } catch { /* not JSON */ }

    if (body && typeof body === "object" && isAuthRejection(body)) {
      return {
        ok: false,
        message: "MSG91 rejected the auth key (invalid or missing). Copy the key from the " +
          "dashboard and reconnect.",
      };
    }
    if (body && typeof body === "object" && !Array.isArray(body) && res.status < 500) {
      // A vendor envelope that is not the rejection: the key was accepted (a "no OTP request"
      // style error about the probe number is expected and fine).
      if (!isFailureBody(body) || errorMessage(body)) return { ok: true };
    }
    return {
      ok: false,
      message: `MSG91 returned HTTP ${res.status} for ${PROBE_PATH} with an unexpected body`,
    };
  },
};

export default authkey;

import type { AuthDefinition } from "@w6w/types";
import { API_BASE, API_PREFIX, errorMessage, parseError } from "../lib/client.ts";

/**
 * HTTP Basic — the vendor's primary method. The Authentication guide says to use "the same
 * username/password pair you use to sign in to the user interface" (the token endpoint names the
 * same two values `appKey`/`appSecret`: "App key or user email/username", "App secret or user
 * password"), base64-encoded as `Authorization: Basic base64(user:pass)`.
 *
 * OAuth2 Bearer (`POST /v1/tokens/create` -> 90 minute access token + 60 day refresh token) is also
 * documented, but it is the same credential pair exchanged for a short-lived token, so it adds
 * nothing a connection needs; it is deliberately not implemented. (The embedded OpenAPI's OAuth
 * `tokenUrl` points at a staging host, `nova-app.stg0.cf.wtf` — a trap, never used.)
 *
 * ## The probe is `GET /v1/credits`, and the body decides
 *
 * Observed live 2026-10-06 (no credential in the probe, so these are the real shapes):
 *
 * | Sent                     | Answer                                                      |
 * | ------------------------ | ----------------------------------------------------------- |
 * | no `Authorization`       | `401 {"title":"Missing authorization header"}`             |
 * | `Basic` + wrong password | `401 {"title":"Invalid username or password"}`            |
 *
 * The documented `200` is `{planCredits, anytimeCredits, totalCredits}` — three integers, never the
 * credential, so the probe cannot echo it into a health report. A `200` whose body is not that
 * object is NOT `ok`.
 */
export interface EzTextingCredential {
  appKey: string;
  appSecret: string;
}

export function authHeader(credential: Partial<EzTextingCredential>): string {
  return `Basic ${btoa(`${credential.appKey ?? ""}:${credential.appSecret ?? ""}`)}`;
}

export const PROBE_PATH = "/credits";

const basic: AuthDefinition = {
  key: "basic",
  type: "basic",
  displayName: "Username & Password",
  description:
    "Your EZ Texting sign-in username (or email) and password, sent as HTTP Basic auth to a.eztexting.com.",
  connectionLabel: "EZ Texting",
  fields: [
    {
      key: "appKey",
      label: "Username or App Key",
      type: "secret",
      required: true,
      row: "creds",
      hint: "The username or email you sign in to EZ Texting with.",
    },
    {
      key: "appSecret",
      label: "Password or App Secret",
      type: "secret",
      required: true,
      row: "creds",
      hint: "The matching password.",
    },
  ],

  sign({ request, credential }) {
    request.headers["authorization"] = authHeader(credential as Partial<EzTextingCredential>);
    return request;
  },

  /** The body decides, not the status — see the module docs. */
  async test({ credential }, ctx) {
    const { appKey, appSecret } = credential as Partial<EzTextingCredential>;
    if (!appKey || !appSecret) {
      return { ok: false, message: "credential missing appKey or appSecret" };
    }

    let res: Response;
    try {
      res = await ctx.fetch(`${API_BASE}${API_PREFIX}${PROBE_PATH}`, {
        headers: { accept: "application/json", authorization: authHeader({ appKey, appSecret }) },
      });
    } catch (err) {
      return {
        ok: false,
        message: `could not reach ${API_BASE} — this is not a statement about the credential: ${
          String(err)
        }`,
      };
    }

    const text = await res.text().catch(() => "");
    const body = parseError(text) as Record<string, unknown> | undefined;

    if (res.ok) {
      if (body && typeof body.totalCredits === "number") return { ok: true };
      return {
        ok: false,
        message: `EZ Texting answered ${res.status} for GET ${API_PREFIX}${PROBE_PATH} without a ` +
          "credit balance object, so the endpoint no longer proves the credential is live",
      };
    }

    const reason = errorMessage(body);
    if (res.status === 401) {
      return {
        ok: false,
        message: `EZ Texting rejected the credential (401${reason ? `: ${reason}` : ""}). Check ` +
          "the username and password you sign in to EZ Texting with.",
      };
    }
    return {
      ok: false,
      message: `EZ Texting returned ${res.status}${reason ? `: ${reason}` : ""} — not a clear ` +
        "statement about the credential",
    };
  },
};

export default basic;

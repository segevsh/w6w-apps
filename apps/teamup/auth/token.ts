import type { AuthDefinition } from "@w6w/types";
import { API_BASE, API_PREFIX, readTeamUpError } from "../lib/client.ts";

/**
 * TeamUp M2M token — `Authorization: Bearer <M2M_TOKEN>`.
 *
 * ## Why this is the only auth method this app can use
 *
 * TeamUp documents three ways in:
 *
 *  1. **OAuth 2.0 (`authorization_code`)** — needs an interactive consent
 *     screen and a registered application, so it cannot be driven from a
 *     headless workflow.
 *  2. **Direct Authentication** (password login) — only switched on after a
 *     manual vendor review of the integrator's use case; not generally
 *     available.
 *  3. **M2M token** — a long-lived opaque token a business creates by hand in
 *     its own TeamUp dashboard, tied to the **business** rather than to a
 *     user. TeamUp explicitly does not offer `client_credentials` or static
 *     API keys; the M2M token *is* the API key for server-to-server access.
 *
 * This app implements (3) and nothing else.
 *
 * ## The prefix is `Bearer`, and that is a deliberate choice
 *
 * The hand-written Authentication guide states the header verbatim, for both
 * OAuth access tokens and M2M tokens: `Authorization: Bearer <TOKEN>`. The
 * auto-generated OpenAPI `securitySchemes` metadata that ships inside each
 * reference page's JS chunk disagrees with itself — one scheme labelled
 * "Token Authentication" with a `Token ` prefix, another "JWT Authentication"
 * with a `JWT ` prefix, neither literally `Bearer`. The hand-written page is
 * the one written to disambiguate exactly this confusion (it has a
 * "Troubleshooting: Wrong Token" section for it), so `Bearer` wins — see the
 * README.
 *
 * Because an M2M token always operates in **Provider mode** under admin
 * permissions, no `TeamUp-Request-Mode` header is sent. `TeamUp-Provider-ID`
 * is sent only when an action's `providerId` is supplied.
 *
 * ## The probe is `GET /auth/profiles`, judged by its BODY
 *
 * The probe needs nothing but the token, and its answer is the plain
 * pagination envelope `{count, next, previous, results}` — there is no token,
 * key or secret field anywhere in it, which is what makes it safe to keep the
 * result in the health surface.
 *
 * Validity is read from the body, never from the status code alone:
 *
 *  - a `results` array (even an empty one) means the token is live;
 *  - a `401` is *explained* by its documented error envelope
 *    (`{"code", "field_errors", "message", "type"}`) — `authentication_failed`
 *    is the code for an invalid or expired credential, and its `message` is
 *    surfaced as the failure text;
 *  - anything else is a failure that quotes the status and the (truncated)
 *    body, so a proxy error page is not mistaken for a credential problem.
 */

export interface TeamUpCredential {
  /** The opaque M2M token — no dots, unlike an OAuth JWT. */
  token: string;
}

/**
 * The one place the wire format is built — `sign`, `test` and `afterConnect`
 * all reuse it, so a probe can never send a header real requests do not.
 */
export function authHeaders(credential: Partial<TeamUpCredential>): Record<string, string> {
  return { authorization: `Bearer ${credential.token ?? ""}` };
}

/** The credential-liveness probe: a paginated read that needs only the token. */
export const PROBE_PATH = "/auth/profiles";

/** The cheap read `afterConnect` uses to name the business. */
export const PROVIDERS_PATH = "/providers";

/** TeamUp's invalid-or-expired-credential code, per the Errors guide. */
export const AUTHENTICATION_FAILED = "authentication_failed";

/** Is this body the documented pagination envelope? */
export function isPaginationEnvelope(body: unknown): body is {
  count?: number;
  next?: string | null;
  previous?: string | null;
  results: unknown[];
} {
  if (body === null || typeof body !== "object" || Array.isArray(body)) return false;
  return Array.isArray((body as { results?: unknown }).results);
}

const token: AuthDefinition = {
  key: "token",
  type: "bearer",
  displayName: "M2M Token",
  description: "Connect with an M2M token created in your TeamUp dashboard. TeamUp sends it as " +
    "`Authorization: Bearer <token>`; the token belongs to the business, not to a user.",
  connectionLabel: "TeamUp ({{providerName}})",
  fields: [
    {
      key: "token",
      label: "M2M Token",
      type: "secret",
      required: true,
      hint: "Create it in your TeamUp dashboard under Settings, in the developer/API area " +
        "(https://docs.goteamup.com/guides/creating-an-m2m-token). It is an opaque key with no " +
        "dots — unlike an OAuth access token, which has three dot-separated parts. Treat it as " +
        "a long-lived business credential: anyone holding it can read and write this business's " +
        "customers and schedule.",
    },
  ],

  /**
   * The only hook handed the raw credential. Runs network-less: it stamps the
   * `Bearer` header and returns. The token never reaches a URL or a body.
   */
  sign({ request, credential }) {
    const cred = credential as Partial<TeamUpCredential>;
    for (const [name, value] of Object.entries(authHeaders(cred))) {
      request.headers[name] = value;
    }
    return request;
  },

  /** See the module docs: `GET /auth/profiles`, classified from the body. */
  async test({ credential }, ctx) {
    const cred = credential as Partial<TeamUpCredential>;
    const key = (cred?.token ?? "").trim();
    if (!key) return { ok: false, message: "credential missing token" };

    let res: Response;
    try {
      res = await ctx.fetch(`${API_BASE}${API_PREFIX}${PROBE_PATH}`, {
        headers: { accept: "application/json", ...authHeaders({ token: key }) },
      });
    } catch (err) {
      return { ok: false, message: `could not reach ${API_BASE}: ${String(err)}` };
    }

    const text = await res.text().catch(() => "");
    let body: unknown;
    try {
      body = JSON.parse(text);
    } catch {
      body = undefined;
    }

    // Classified from the body: the envelope, not the status code, says live.
    if (isPaginationEnvelope(body)) {
      const count = typeof body.count === "number" ? `, ${body.count} profiles visible` : "";
      return { ok: true, message: `the M2M token is live${count}` };
    }

    const { detail, code } = readTeamUpError(text);
    const suffix = detail ? `: ${detail}` : "";
    if (code === AUTHENTICATION_FAILED) {
      return {
        ok: false,
        message:
          `TeamUp rejected the M2M token (HTTP ${res.status}, code ${AUTHENTICATION_FAILED}` +
          `${suffix}) — it is invalid, has been deleted, or belongs to a different business`,
      };
    }
    if (!res.ok) {
      return {
        ok: false,
        message: `TeamUp refused the M2M token (HTTP ${res.status}` +
          `${code ? `, code ${code}` : ""}${suffix})`,
      };
    }
    return {
      ok: false,
      message: `HTTP ${res.status} from GET ${PROBE_PATH} did not return TeamUp's pagination ` +
        `envelope${suffix} — TeamUp answered, but not with a readable profile list`,
    };
  },

  /**
   * Publish the business's name, and nothing else.
   *
   * `GET /auth/profiles` carries no business name, so this reads the first
   * provider instead — a read the token already has to be able to make, and
   * one that costs a single page of one record. A list of Connections all
   * labelled "TeamUp" would be unusable; a failure here is deliberately
   * silent, because `test` has already established the token is live and a
   * missing label must not fail a good Connection.
   */
  async afterConnect({ credential }, ctx) {
    const cred = credential as Partial<TeamUpCredential>;
    try {
      const res = await ctx.fetch(
        `${API_BASE}${API_PREFIX}${PROVIDERS_PATH}?page_size=1`,
        { headers: { accept: "application/json", ...authHeaders(cred) } },
      );
      if (!res.ok) return {};
      const body = await res.json() as { results?: Array<{ name?: unknown }> };
      const name = body?.results?.[0]?.name;
      return typeof name === "string" && name ? { providerName: name } : {};
    } catch {
      return {};
    }
  },
};

export default token;

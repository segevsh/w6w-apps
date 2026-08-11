import type { AuthDefinition } from "@w6w/types";
import { API_BASE, API_PREFIX } from "../lib/client.ts";

/**
 * Productboard access token — `Authorization: Bearer <token>`.
 *
 * Verified against `components.securitySchemes.BearerAuth` in all nine v2
 * OpenAPI documents (`{"type":"http","scheme":"bearer","bearerFormat":"JWT"}`),
 * against the Authentication page of the reference, and against live probes to
 * `api.productboard.com` on 2026-08-11.
 *
 * ## One header, and no `X-Version`
 *
 * The reference's Authentication page states the wire format once and for all
 * four of Productboard's token flavours: *"All methods require the
 * `Authorization` header: `Authorization: Bearer <your-token>`"*, and its own
 * curl example calls `https://api.productboard.com/v2/notes` with nothing but
 * that header and `Accept`. **No `X-Version` header** — that one belongs to the
 * (wholly deprecated) v1 API. See `lib/client.ts` for the measurement.
 *
 * ## The token is a JWT, and the gateway says so before the API sees it
 *
 * `bearerFormat: JWT` is not decorative. The gateway parses the token before
 * routing, which is why a non-JWT string comes back as
 * `{"message":"Bad token; invalid JSON"}` — a message about *JSON*, on a
 * request that had no body. Anyone reading that as "my request body was
 * malformed" will lose an afternoon; it means "the string you put after
 * `Bearer` is not a JWT".
 *
 * ## Why OAuth 2.0 is NOT declared here
 *
 * Productboard documents four authentication methods and this app implements
 * one. The omission is deliberate and specific, not laziness:
 *
 *  - The OAuth2 security scheme in the v2 documents declares exactly **three**
 *    scopes — `entities:read`, `write:entities`, `entities:delete` — identically
 *    in all nine files, including `notes.yaml`, `teams.yaml` and
 *    `analytics.yaml`.
 *  - The per-operation `security` blocks in those same files require
 *    `notes:read`, `notes:write`, `notes:delete`, `teams:read`, `teams:write`,
 *    `teams:delete`, `members:read`, `webhooks:read`, `webhooks:write`,
 *    `webhooks:delete`, `analytics:read`, `jira-integrations:read`,
 *    `plugin-integrations:read/write/delete`, `fields:write` and
 *    `members:pii:read` — none of which appear in the OAuth2 scope list.
 *  - The two halves also disagree on spelling: the OAuth2 flow says
 *    `write:entities` while every operation says `entities:write`.
 *
 * An OAuth2 method built from that list would mint tokens missing the scope for
 * most of this app's surface, and there is no way to tell from the document
 * which spelling the authorization server accepts. That is a question for the
 * vendor, not a guess to ship. An access token obtained through any of the four
 * flows — personal token, authorization code, server-to-server JWT — is pasted
 * into the field below and works identically, because they all present the same
 * header.
 */

export interface ProductboardCredential {
  accessToken: string;
}

/**
 * The one place the wire format is built. Exported so `test` exercises the same
 * code path `sign` does — a hand-rolled second copy is how a probe ends up
 * sending a header the real requests do not.
 */
export function authHeaders(
  credential: Partial<ProductboardCredential>,
): Record<string, string> {
  return { authorization: `Bearer ${credential.accessToken ?? ""}` };
}

/**
 * The credential-liveness probe.
 *
 * `GET /v2/entities/configurations` was chosen by reading the response *schema*
 * and by measuring the wire on 2026-08-11, not by its name:
 *
 * **(a) It requires a credential.** Unauthenticated it answers `401` with
 * `{"message":"Unauthorized"}`, measured live. Every v2 path does — there is no
 * public corner of this API to trip over, unlike Apify's `/v2/store` or
 * ElevenLabs' `/v1/voices` — but it was measured rather than assumed.
 *
 * **(b) It returns no customer data and no personal data.** The response is the
 * *shape* of the workspace: for each entity type, its available fields, their
 * types, their validation rules and which patch operations they accept. No
 * feature, no note, no member. The obvious alternatives are all worse on this
 * axis — `GET /v2/members` returns every member's email address, and
 * `GET /v2/entities` returns the workspace's actual roadmap.
 *
 * **(c) It carries no credential material of any kind.** Nothing in the
 * `Configuration` schema is a secret. Productboard's two write-only secrets —
 * a webhook's `notification.headers.authorization` and a plugin integration's
 * `action.headers.authorization` — are documented as never returned in any
 * response, and neither lives on this path regardless.
 *
 * **(d) It needs no id.** A probe that needed a feature id would be a probe
 * that breaks when that feature is archived.
 *
 * Its scope is `entities:read`, which is the narrowest scope any useful
 * Productboard connection can lack and still be worth having: an app whose
 * subject is the product hierarchy is not working without it.
 */
export const PROBE_PATH = "/entities/configurations";

/**
 * The four measured 401 bodies, kept as an exported table so the classifier
 * below can be read against the wire rather than against an assumption.
 *
 * All four are **HTTP 401**. Deciding "is this credential valid?" from the
 * status code is therefore impossible on this API; the body is the only signal.
 */
export const AUTH_FAILURE_BODIES = {
  /** No `Authorization` header at all, or `Bearer ` with an empty token. */
  missing: "Unauthorized",
  /** The token is not a JWT — a typo, a truncated paste, or a v1-era key. */
  notAJwt: "Bad token; invalid JSON",
  /** A well-formed JWT whose issuer this workspace does not know. */
  unknownIssuer: "No credentials found for given 'iss'",
} as const;

/**
 * Classify a failed probe from the response **body**, never the status.
 *
 * Returns the operator-facing sentence. Split out from `test` so the mapping is
 * unit-testable against the exact bodies measured on the wire.
 */
export function classifyAuthFailure(
  status: number,
  body: { message?: string; errors?: Array<{ code?: string; detail?: string }> } | null,
): string {
  const message = body?.message ?? "";
  const code = body?.errors?.[0]?.code;
  const detail = body?.errors?.[0]?.detail;

  if (message === AUTH_FAILURE_BODIES.missing) {
    return "Productboard received no token. The credential did not reach the request — " +
      "reconnect this connection.";
  }
  if (message === AUTH_FAILURE_BODIES.notAJwt) {
    return "Productboard could not parse the token. Productboard tokens are JWTs — this looks " +
      "like a truncated paste, or a v1-era key. Copy the whole token from Productboard > " +
      "Workspace settings > Integrations > Public API.";
  }
  if (message === AUTH_FAILURE_BODIES.unknownIssuer) {
    return "Productboard does not recognise the issuer of this token. It belongs to a different " +
      "workspace, or it has been revoked.";
  }
  if (code === "route.notFound") {
    return `Productboard answered ${status} route.notFound for ${PROBE_PATH}. The API v2 path ` +
      "moved — this app needs updating, the credential is not the problem.";
  }
  if (code === "auth.accessDenied" || status === 403) {
    return `Productboard accepted the token but refused the read (403${code ? ` ${code}` : ""})${
      detail ? `: ${detail}` : ""
    }. The token is live but lacks the entities:read scope or ` +
      "the workspace permission.";
  }
  if (status === 401) {
    return `Productboard rejected the token (401${message ? `: ${message}` : ""}).`;
  }
  return `Productboard returned HTTP ${status} for ${PROBE_PATH}${message ? `: ${message}` : ""}.`;
}

const apiToken: AuthDefinition = {
  key: "api-token",
  type: "bearer",
  displayName: "Access Token",
  description:
    "Paste a Productboard access token. The quickest one to get is a personal API token from " +
    "Workspace settings > Integrations > Public API > Access token. A token from any of " +
    "Productboard's OAuth flows works here too — they all authenticate with the same " +
    "Authorization: Bearer header.",
  fields: [
    {
      key: "accessToken",
      label: "Access Token",
      type: "secret",
      required: true,
      hint:
        "Productboard > Workspace settings > Integrations > Public API. The token is a JWT, so " +
        "it is long and contains two dots — make sure the whole string is pasted. Use a token " +
        "dedicated to this connection rather than one shared with other services.",
    },
  ],

  /**
   * The only hook handed the raw credential, and it runs network-less: it
   * stamps the bearer header and returns. The token never appears in a URL —
   * Productboard offers no query-parameter form, and there would be no reason
   * to use one if it did.
   */
  sign({ request, credential }) {
    const cred = credential as Partial<ProductboardCredential>;
    for (const [name, value] of Object.entries(authHeaders(cred))) {
      request.headers[name] = value;
    }
    return request;
  },

  /** See {@link PROBE_PATH} for why this endpoint, and {@link classifyAuthFailure} for why the body. */
  async test({ credential }, ctx) {
    const cred = credential as Partial<ProductboardCredential>;
    const token = (cred?.accessToken ?? "").trim();
    if (!token) return { ok: false, message: "credential missing accessToken" };

    const res = await ctx.fetch(`${API_BASE}${API_PREFIX}${PROBE_PATH}`, {
      headers: { accept: "application/json", ...authHeaders({ accessToken: token }) },
    });
    if (res.ok) return { ok: true };

    const body = await res.json().catch(() => null) as
      | { message?: string; errors?: Array<{ code?: string; detail?: string }> }
      | null;
    return { ok: false, message: classifyAuthFailure(res.status, body) };
  },
};

export default apiToken;

import type { AuthDefinition, HookContext } from "@w6w/types";
import { API_BASE, readErrorBody, TOKEN_URL } from "../lib/client.ts";

/**
 * OAuth2 **client credentials** — a Practice Better integration's client id and
 * secret, exchanged for a bearer token.
 *
 * All of the following was read from the vendor's own OpenAPI 3.0 document
 * (`https://api-docs.practicebetter.io/swagger.json`, 2026-09-22):
 *
 *  - `components.securitySchemes.oauth2` declares one flow,
 *    **`clientCredentials`**, with `tokenUrl`
 *    `https://api.practicebetter.io/oauth2/token` and the two scopes `read` and
 *    `write` — most GET operations declare [`read`], every mutating operation
 *    declares [`read`, `write`].
 *  - `POST /oauth2/token` (`operationId: OAuth2_grant`) takes an
 *    `application/x-www-form-urlencoded` body of schema `OAuthTokenRequest`,
 *    whose documented properties are exactly **`client_id` and `client_secret`**.
 *  - Its response, `OAuthTokenResponse`, is exactly **`access_token`,
 *    `expires_in` (int64) and `token_type`**.
 *
 * ## Three deliberate omissions, each because the document has nothing to fill
 *
 * 1. **No `grant_type` field.** A client-credentials request normally carries
 *    `grant_type=client_credentials`, and sibling apps in this pack send it —
 *    because *their* vendors document it. This document does not: `grant_type`
 *    appears zero times in the whole 650 KB file, and `OAuthTokenRequest` lists
 *    only the two credentials. So exactly `client_id` and `client_secret` are
 *    sent, and only those.
 * 2. **No refresh token, and no refresh grant.** `OAuthTokenResponse` has no
 *    `refresh_token` property, and there is no separate refresh operation
 *    anywhere in the document. So `refresh` here re-runs the *same*
 *    client-credentials exchange — the client id and secret are the durable
 *    authority and the token is the only thing that expires, which is exactly
 *    the shape the sibling `ebay` app's client-credentials auth documents.
 * 3. **No `revoke` hook.** The document declares no revoke endpoint, so there is
 *    nothing to call on disconnect. A stub that pretended to revoke would be a
 *    lie in a file other people read to understand the API; the token simply
 *    expires. (This is why `type` is `"custom"` rather than `"oauth2"`, which
 *    models the browser authorization-code flow this app cannot use at all.)
 *
 * ## The probe is `GET /timezones`, and why it says nothing secret
 *
 * The probe is chosen by what its **body** contains, never by what the route is
 * called. `GET /timezones` (`operationId: TimeZone_List`) is the cheapest read in
 * the covered surface: no path parameters, no query parameters, no client data
 * at all — its body is a static list of `{label, name, tzName}` objects, the
 * vocabulary `POST /consultant/sessions` expects for its `timeZone` field. A
 * static list of time-zone names cannot contain a credential, so the probe
 * result is safe to keep in the health surface. It needs only the `read` scope
 * that every usable key carries, so it cannot report a working credential as
 * broken the way a client-records read could.
 *
 * ## Classification, given that the document declares no error body
 *
 * `POST /oauth2/token` documents `400`/`401`/`500` with a `description` and **no
 * response schema**, and the same is true of every operation in the document —
 * the only error-shaped schema anywhere (`ExternalApiError`) describes errors
 * from third-party systems, not Practice Better's own bodies. So the body is
 * read *defensively* ({@link readErrorBody}: try JSON, fall back to raw text,
 * fall back to nothing) and classification is by status, with the body as
 * evidence: a `401` is reported as a bad client id/secret, a `403` as a token
 * that authenticated but lacks the scope or plan, and anything else as itself.
 *
 * ## `sign` is the only hook that sees the credentials
 *
 * `mintToken` is the sole place the client id and secret are read for the
 * network, and it is reachable only from `exchange`, `refresh` and `test`. No
 * action can reach it: actions receive an already-signed request, and
 * `tests/index.test.ts` scans every action's source to keep it that way.
 */

/** The token response, per the document's `OAuthTokenResponse` schema. */
interface TokenResponse {
  access_token?: string;
  expires_in?: number;
  token_type?: string;
}

/** What this app persists on the Connection. */
export interface PracticeBetterCredential {
  clientId: string;
  clientSecret: string;
  accessToken: string;
  expiresAt?: string;
}

/** The list-endpoint read `test` and `afterConnect` reuse — see the module docs. */
export const TIMEZONES_PATH = "/timezones";

/** The consultant profile `afterConnect` reuses to label the Connection. */
export const PROFILE_PATH = "/consultant/profile";

/**
 * `POST /oauth2/token` — form body, credentials in the body.
 *
 * The document declares `client_id` and `client_secret` as form properties and
 * nothing else (see the module docs on `grant_type`), so the body is exactly
 * those two fields. Failures never echo the body or the credentials.
 */
async function mintToken(
  ctx: HookContext,
  creds: { clientId: string; clientSecret: string },
): Promise<Record<string, unknown>> {
  const res = await ctx.fetch(TOKEN_URL, {
    method: "POST",
    headers: {
      "content-type": "application/x-www-form-urlencoded",
      accept: "application/json",
    },
    body: new URLSearchParams({
      client_id: creds.clientId,
      client_secret: creds.clientSecret,
    }).toString(),
  });

  const text = await res.text().catch(() => "");
  let body: TokenResponse = {};
  try {
    body = text ? JSON.parse(text) as TokenResponse : {};
  } catch {
    body = {};
  }

  if (!res.ok || !body.access_token) {
    const { detail } = readErrorBody(text);
    throw new Error(
      `Practice Better token request failed (HTTP ${res.status})${detail ? `: ${detail}` : ""}`,
    );
  }
  return {
    ...creds,
    accessToken: body.access_token,
    // `expires_in` is documented, but no *lifetime* is: the value is taken from
    // the response and the 60-second haircut absorbs clock skew between this
    // host and Practice Better. The 3600 s fallback applies only if the field is
    // missing entirely — no default is published, so the conservative one-hour
    // assumption is stated here rather than hidden.
    expiresAt: new Date(Date.now() + ((body.expires_in ?? 3600) - 60) * 1000).toISOString(),
  };
}

/** Is this body the documented time-zone list? */
export function isTimezoneList(body: unknown): boolean {
  if (!Array.isArray(body) || body.length === 0) return false;
  return body.every((item) =>
    item !== null && typeof item === "object" &&
    typeof (item as { name?: unknown }).name === "string"
  );
}

const clientCredentials: AuthDefinition = {
  key: "client-credentials",
  type: "custom",
  displayName: "Client Credentials",
  description:
    "Connect with the client id and client secret Practice Better issues for its machine-to-machine " +
    "OAuth2 client-credentials grant. No browser sign-in, so it keeps working in scheduled and " +
    "background runs. Reads need the `read` scope; every write needs `read` and `write`.",
  connectionLabel: "Practice Better ({{emailAddress}})",
  fields: [
    {
      key: "clientId",
      label: "Client ID",
      type: "secret",
      required: true,
      row: "client",
      hint: "The client id Practice Better issued for this API integration. Sent in the token " +
        "request body, never in a URL.",
    },
    {
      key: "clientSecret",
      label: "Client Secret",
      type: "secret",
      required: true,
      row: "client",
      hint:
        "The matching client secret. Sent in the token request body; successful exchanges are " +
        "cached until the token expires, then re-run with these same two values.",
    },
  ],

  /** Turns the pasted client id and secret into a live token at connect time. */
  exchange({ fields }, ctx) {
    const f = (fields ?? {}) as Record<string, unknown>;
    const clientId = String(f.clientId ?? "").trim();
    const clientSecret = String(f.clientSecret ?? "").trim();
    if (!clientId || !clientSecret) {
      throw new Error("Client ID and Client Secret are both required.");
    }
    return mintToken(ctx, { clientId, clientSecret });
  },

  /**
   * Renew an expired token by re-running the client-credentials exchange.
   *
   * There is no refresh token and no refresh grant in this document, so there is
   * nothing to trade: the client id and secret are the durable authority and the
   * access token is the only thing with a lifetime. This is the same conclusion
   * the sibling `ebay` app reaches for the same reason.
   */
  refresh({ credential }, ctx) {
    const cred = credential as Partial<PracticeBetterCredential>;
    const clientId = cred?.clientId ?? "";
    const clientSecret = cred?.clientSecret ?? "";
    if (!clientId || !clientSecret) {
      throw new Error("credential is missing clientId or clientSecret — reconnect");
    }
    return mintToken(ctx, { clientId, clientSecret });
  },

  /** The only hook that stamps the token. Runs network-less. */
  sign({ request, credential }) {
    const { accessToken } = credential as Partial<PracticeBetterCredential>;
    request.headers["authorization"] = `Bearer ${accessToken ?? ""}`;
    return request;
  },

  /**
   * `GET /timezones` — the probe, judged by its body (see the module docs).
   *
   * `200` alone is not proof: the check requires the documented **shape**, an
   * array of time-zone records. A 2xx that is not that list is reported as a
   * failure — something answered, but not with the endpoint this app asked for.
   */
  async test({ credential }, ctx) {
    const cred = credential as Partial<PracticeBetterCredential>;
    const token = (cred?.accessToken ?? "").trim();
    if (!token) return { ok: false, message: "credential missing an access token — reconnect" };

    let res: Response;
    try {
      res = await ctx.fetch(`${API_BASE}${TIMEZONES_PATH}`, {
        headers: { accept: "application/json", authorization: `Bearer ${token}` },
      });
    } catch (err) {
      return { ok: false, message: `could not reach ${API_BASE}: ${String(err)}` };
    }

    const text = await res.text().catch(() => "");
    let body: unknown;
    try {
      body = text ? JSON.parse(text) : undefined;
    } catch {
      body = undefined;
    }

    if (res.ok && isTimezoneList(body)) {
      const count = Array.isArray(body) ? body.length : 0;
      return { ok: true, message: `the access token is live (${count} time zones listed)` };
    }

    const { detail } = readErrorBody(text);
    const suffix = detail ? `: ${detail}` : "";
    // Status is the classifier the document supports (it publishes no error
    // body shape for this or any other operation); the body is only evidence.
    if (res.status === 401) {
      return {
        ok: false,
        message:
          `Practice Better rejected the access token (HTTP 401${suffix}) — the client id or ` +
          "client secret is wrong, or the integration was rotated or removed",
      };
    }
    if (res.status === 403) {
      return {
        ok: false,
        message:
          `Practice Better authenticated the request but refused it (HTTP 403${suffix}) — the ` +
          "credential is live; check that the integration carries the `read` scope",
      };
    }
    if (!res.ok) {
      return {
        ok: false,
        message: `Practice Better returned HTTP ${res.status} for GET ${TIMEZONES_PATH}${suffix}`,
      };
    }
    return {
      ok: false,
      message:
        `HTTP ${res.status} from GET ${TIMEZONES_PATH} did not return the documented time-zone ` +
        `list${suffix} — Practice Better answered, but not with a readable list`,
    };
  },

  /**
   * Label the Connection with the consultant the credentials belong to.
   *
   * A client id is opaque, so the name has to be fetched. This reuses the exact
   * call the `get-consultant-profile` action makes — no new endpoint, no new
   * failure mode — and returns `{}` rather than throwing if anything goes wrong,
   * because a missing label must never block a Connection that authenticates.
   *
   * Only the email address and the company name are echoed: they identify the
   * account, and neither is credential material.
   */
  async afterConnect({ credential }, ctx) {
    const cred = credential as Partial<PracticeBetterCredential>;
    if (!cred?.accessToken) return {};
    try {
      const res = await ctx.fetch(`${API_BASE}${PROFILE_PATH}`, {
        headers: { accept: "application/json", authorization: `Bearer ${cred.accessToken}` },
      });
      if (!res.ok) return {};
      const body = await res.json().catch(() => null) as {
        emailAddress?: unknown;
        company?: { name?: unknown };
      } | null;
      const emailAddress = typeof body?.emailAddress === "string" ? body.emailAddress : undefined;
      const company = typeof body?.company?.name === "string" ? body.company.name : undefined;
      if (!emailAddress && !company) return {};
      return { emailAddress, company };
    } catch {
      return {};
    }
  },
  // No `revoke`: the document declares no revoke endpoint for this grant, so
  // disconnecting simply lets the token expire. See the module docs.
};

export default clientCredentials;

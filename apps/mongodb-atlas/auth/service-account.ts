import type { AuthDefinition } from "@w6w/types";
import { API_HOST, describeError, mediaType, OAUTH_TOKEN_URL } from "../lib/client.ts";

/**
 * An Atlas **service account**: OAuth 2.0 client credentials, no browser.
 *
 * ## Why not the API key, which is what the docs lead with
 *
 * Atlas's original scheme is a public/private API key pair authenticated with
 * **HTTP Digest**. Probed live, an unauthenticated call answers:
 *
 *     www-authenticate: Digest realm="MMS Public API", nonce="…", qop="auth"
 *
 * Digest is a challenge-response protocol: send a request, receive a 401
 * carrying a server nonce, then send it again with an MD5 hash of the nonce,
 * the credentials, the method and the path. A `sign` hook is handed one
 * request and no challenge. It cannot do the round-trip, and there is no way
 * to pre-compute the hash without the nonce.
 *
 * So Digest is not merely awkward here — it is unimplementable in this shape,
 * and that is why this app takes service accounts only. They are also what
 * MongoDB now recommends for automation.
 *
 * ## The credentials go in the Authorization header, not the body
 *
 * Measured, and it is a 400 rather than a 401 when you get it wrong:
 *
 *     POST /api/oauth/token   grant_type=client_credentials
 *       with client_id/client_secret in the BODY
 *       -> 400 {"error":"invalid_request",
 *               "error_description":"No Authorization header provided"}
 *
 *       with the same values as HTTP Basic
 *       -> 401 {"error":"invalid_client", …}   (for wrong credentials)
 *
 * Both forms are legal OAuth. Atlas accepts only the second, and the error for
 * the first names a missing header rather than the credentials — which reads
 * like a bug in the client rather than a choice of form.
 *
 * ## The token lasts an hour and the client id is not secret
 *
 * `mdb_sa_id_…` is the client id and `mdb_sa_sk_…` is the secret. The secret
 * is shown once, at creation. The token expires in an hour, which is why
 * `refresh` exists and why a long-running workflow does not hold one.
 *
 * ## Roles are per project, not only per organisation
 *
 * A service account is created in an organisation and granted roles there.
 * Reaching into a project still needs a role **on that project**, and the
 * failure is a 403 that names neither.
 */
interface TokenResponse {
  access_token?: string;
  expires_in?: number;
  error?: string;
  error_description?: string;
}

async function mintToken(
  ctx: Parameters<NonNullable<AuthDefinition["refresh"]>>[1],
  creds: { clientId: string; clientSecret: string },
): Promise<Record<string, unknown>> {
  const res = await ctx.fetch(OAUTH_TOKEN_URL, {
    method: "POST",
    headers: {
      // Basic, not the body — Atlas answers 400 "No Authorization header
      // provided" for the body form, which is otherwise legal OAuth.
      authorization: `Basic ${btoa(`${creds.clientId}:${creds.clientSecret}`)}`,
      "content-type": "application/x-www-form-urlencoded",
      accept: "application/json",
    },
    body: "grant_type=client_credentials",
  });
  const body = await res.json().catch(() => ({})) as TokenResponse;
  if (!res.ok || !body.access_token) {
    throw new Error(
      `Atlas token request failed (${res.status}): ${
        body.error_description ?? body.error ?? "no token returned"
      }`,
    );
  }
  return {
    ...creds,
    accessToken: body.access_token,
    // An hour, with a minute of headroom for clock skew.
    expiresAt: new Date(Date.now() + ((body.expires_in ?? 3600) - 60) * 1000).toISOString(),
  };
}

const serviceAccount: AuthDefinition = {
  key: "service-account",
  type: "custom",
  displayName: "Service Account",
  description:
    "An Atlas service account's client id and secret, exchanged for an hour-long token. The " +
    "older API-key scheme uses HTTP DIGEST, which needs a challenge round-trip and cannot be " +
    "done from a signing hook at all.",
  connectionLabel: "{{orgName}}",
  fields: [
    {
      key: "clientId",
      label: "Client ID",
      type: "secret",
      required: true,
      row: "client",
      placeholder: "mdb_sa_id_…",
      hint: "Organization Settings → Access Manager → Applications. Not secret in itself, but " +
        "kept with the secret because refreshing needs both.",
    },
    {
      key: "clientSecret",
      label: "Client Secret",
      type: "secret",
      required: true,
      row: "client",
      placeholder: "mdb_sa_sk_…",
      hint: "Shown ONCE, when the service account is created. Grant it a role on each project " +
        "it must reach — organisation access alone gives 403 on a project.",
    },
  ],

  /** Turns the pasted pair into a live token at connect time. */
  exchange({ fields }, ctx) {
    const { clientId, clientSecret } = (fields ?? {}) as Record<string, string>;
    if (!clientId || !clientSecret) {
      throw new Error("Client ID and Client Secret are both required.");
    }
    return mintToken(ctx, { clientId, clientSecret });
  },

  /** The same call again — the client credentials outlive the token. */
  refresh({ credential }, ctx) {
    const { clientId, clientSecret } = credential as Record<string, string>;
    return mintToken(ctx, { clientId, clientSecret });
  },

  sign({ request, credential }) {
    const { accessToken } = credential as { accessToken: string };
    request.headers["authorization"] = `Bearer ${accessToken}`;
    return request;
  },

  /**
   * `GET /api/atlas/v2/orgs` — the smallest call that proves the token and
   * reports what it can see.
   *
   * A service account with no organisation role authenticates perfectly and
   * lists nothing, which is worth saying out loud: the credential is fine and
   * the account is useless until somebody grants it a role.
   */
  async test({ credential }, ctx) {
    const { accessToken } = credential as { accessToken?: string };
    if (!accessToken) {
      return { ok: false, message: "credential has no access token — reconnect" };
    }

    let res: Response;
    try {
      res = await ctx.fetch(`${API_HOST}/api/atlas/v2/orgs`, {
        headers: { authorization: `Bearer ${accessToken}`, accept: mediaType() },
      });
    } catch (err) {
      return { ok: false, message: `could not reach Atlas: ${String(err)}` };
    }
    const text = await res.text().catch(() => "");
    if (!res.ok) {
      return { ok: false, message: describeError(res.status, text) };
    }

    interface OrgList {
      results?: Array<{ id?: string; name?: string }>;
      totalCount?: number;
    }
    let body: OrgList | null = null;
    try {
      body = JSON.parse(text) as OrgList;
    } catch {
      return { ok: false, message: "Atlas did not return JSON" };
    }

    const orgs = body?.results ?? [];
    if (!orgs.length) {
      return {
        ok: false,
        message:
          "the token works and this service account can see no organisations — it has been " +
          "created but not granted a role. Organization Settings → Access Manager → " +
          "Applications, then add a role",
      };
    }
    return {
      ok: true,
      message: `connected to ${orgs[0]?.name ?? "an organisation"}${
        orgs.length > 1 ? ` and ${orgs.length - 1} more` : ""
      }`,
    };
  },

  /**
   * Record which organisation this is, so a connection is identifiable and a
   * project action can say which organisation it was reaching into.
   */
  async afterConnect({ credential }, ctx) {
    const { accessToken } = credential as { accessToken?: string };
    if (!accessToken) return {};
    try {
      const res = await ctx.fetch(`${API_HOST}/api/atlas/v2/orgs`, {
        headers: { authorization: `Bearer ${accessToken}`, accept: mediaType() },
      });
      if (!res.ok) {
        await res.body?.cancel();
        return {};
      }
      const body = await res.json().catch(() => null) as
        | { results?: Array<{ id?: string; name?: string }> }
        | null;
      const orgs = body?.results ?? [];
      const first = orgs[0];
      return {
        orgId: first?.id,
        orgName: first?.name,
        orgCount: orgs.length,
      };
    } catch {
      return {};
    }
  },
};

export default serviceAccount;

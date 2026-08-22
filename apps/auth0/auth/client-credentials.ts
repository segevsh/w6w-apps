import type { AuthDefinition } from "@w6w/types";
import { API_PATH, managementAudience, normalizeDomain } from "../lib/client.ts";

/**
 * Machine-to-machine **client credentials** against the tenant's own token
 * endpoint.
 *
 * This is not the browser flow. A Management API credential is an application
 * of type *Machine to Machine*, authorised against the Management API, and it
 * signs in with nothing but its own id and secret — which is what makes it work
 * in a scheduled run with no human present.
 *
 * Verified 2026-08-18 against a live Auth0 domain: `POST /oauth/token` with
 * `grant_type=client_credentials` and the management `audience` answers
 * `{"error":"access_denied","error_description":"Unauthorized"}` for unknown
 * credentials — it evaluates the pair rather than rejecting the shape.
 *
 * ## The `audience` is the part people miss
 *
 * A token minted without `audience: https://{domain}/api/v2/` is an opaque
 * token for the *Authentication* API, and the Management API rejects it. It is
 * derived here from the domain rather than asked for, because it is not a
 * choice — it is a restatement of the tenant.
 *
 * ## Scopes are granted, not requested
 *
 * A machine-to-machine application is authorised for specific Management API
 * scopes **in the Auth0 dashboard**, and the token carries exactly those. This
 * app therefore requests none: asking for a scope the application was not
 * granted fails the whole token request, while asking for nothing yields
 * everything it was granted. A missing scope shows up later as a `403` on one
 * endpoint, which the client's error message names specifically.
 *
 * ## Tokens are short-lived, and there is nothing to refresh
 *
 * The client credentials grant issues no refresh token — the credential *is*
 * the client id and secret, so `refresh` mints a new access token with the same
 * call `exchange` made. That is why both hooks share one function, and why the
 * id and secret stay in the stored credential.
 */
async function mintToken(
  ctx: Parameters<NonNullable<AuthDefinition["refresh"]>>[1],
  creds: { domain: string; clientId: string; clientSecret: string },
): Promise<Record<string, unknown>> {
  const domain = normalizeDomain(creds.domain);
  const res = await ctx.fetch(`https://${domain}/oauth/token`, {
    method: "POST",
    headers: { "content-type": "application/json", accept: "application/json" },
    body: JSON.stringify({
      grant_type: "client_credentials",
      client_id: creds.clientId,
      client_secret: creds.clientSecret,
      // Without this the token is for the Authentication API, and the
      // Management API will not accept it.
      audience: managementAudience(domain),
    }),
  });
  const body = await res.json().catch(() => ({})) as {
    access_token?: string;
    expires_in?: number;
    error?: string;
    error_description?: string;
  };
  if (!res.ok || !body.access_token) {
    const reason = body.error_description ?? body.error ?? `HTTP ${res.status}`;
    throw new Error(
      `Auth0 refused to mint a Management API token (${reason}). Check that the application is ` +
        "Machine to Machine and is authorised for the Management API on this tenant.",
    );
  }
  return {
    ...creds,
    domain,
    accessToken: body.access_token,
    // Recorded so the host refreshes before Auth0 rejects the token. A minute
    // of headroom absorbs clock skew.
    expiresAt: new Date(Date.now() + ((body.expires_in ?? 86400) - 60) * 1000).toISOString(),
  };
}

const clientCredentials: AuthDefinition = {
  key: "client-credentials",
  type: "custom",
  displayName: "Machine-to-Machine Application",
  description:
    "An Auth0 Machine-to-Machine application authorised for the Management API. No browser " +
    "sign-in, so it works in scheduled runs. Its granted scopes decide what it can do.",
  connectionLabel: "{{tenant}}",
  fields: [
    {
      key: "domain",
      label: "Tenant Domain",
      type: "string",
      required: true,
      placeholder: "acme.us.auth0.com",
      hint: "The canonical tenant domain, including the region. A custom domain fronts the " +
        "Authentication API and is not used here.",
    },
    {
      key: "clientId",
      label: "Client ID",
      type: "secret",
      required: true,
      row: "client",
      hint: "Auth0 Dashboard → Applications → your M2M app → Settings.",
    },
    {
      key: "clientSecret",
      label: "Client Secret",
      type: "secret",
      required: true,
      row: "client",
    },
  ],

  /** Turns the three pasted values into a live Management API token. */
  exchange({ fields }, ctx) {
    const { domain, clientId, clientSecret } = (fields ?? {}) as Record<string, string>;
    if (!domain || !clientId || !clientSecret) {
      throw new Error("Tenant Domain, Client ID and Client Secret are all required.");
    }
    // Fail here, with an explanation, rather than at the sandbox's egress check.
    normalizeDomain(domain);
    return mintToken(ctx, { domain, clientId, clientSecret });
  },

  /** The same call again — only the token expires, never the credentials. */
  refresh({ credential }, ctx) {
    const { domain, clientId, clientSecret } = credential as Record<string, string>;
    return mintToken(ctx, { domain, clientId, clientSecret });
  },

  sign({ request, credential }) {
    const { accessToken } = credential as { accessToken: string };
    request.headers["authorization"] = `Bearer ${accessToken}`;
    return request;
  },

  /**
   * `GET /api/v2/users?per_page=1` — the cheapest call that proves the token is
   * a *Management API* token for *this* tenant.
   *
   * A `403` here is worth distinguishing loudly: it means the credentials are
   * fine and the application was simply never granted `read:users`, which is a
   * dashboard change rather than a credential one.
   */
  async test({ credential }, ctx) {
    const { accessToken, domain } = credential as { accessToken?: string; domain?: string };
    if (!accessToken) return { ok: false, message: "credential has no accessToken — reconnect" };
    if (!domain) return { ok: false, message: "credential has no domain" };

    const res = await ctx.fetch(`https://${domain}${API_PATH}/users?per_page=1`, {
      headers: { authorization: `Bearer ${accessToken}`, accept: "application/json" },
    });
    if (res.status === 401) {
      await res.body?.cancel();
      return {
        ok: false,
        message: "Auth0 rejected the token — it may have expired, or been minted without the " +
          "Management API audience",
      };
    }
    if (res.status === 403) {
      await res.body?.cancel();
      return {
        ok: false,
        message:
          "the token is valid but this application is not authorised to read users — grant it " +
          "`read:users` on the Management API in the Auth0 dashboard",
      };
    }
    if (!res.ok) {
      await res.body?.cancel();
      return { ok: false, message: `Auth0 returned ${res.status}` };
    }
    await res.body?.cancel();
    return { ok: true, message: `connected to ${domain}` };
  },

  /** Records the domain every action needs, and the tenant name for a label. */
  afterConnect({ credential }) {
    const { domain } = credential as { domain: string };
    const host = normalizeDomain(domain);
    return { domain: host, tenant: host.split(".")[0] };
  },
};

export default clientCredentials;

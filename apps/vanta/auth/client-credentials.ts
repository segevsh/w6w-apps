import type { AuthDefinition } from "@w6w/types";
import { API_PATH, hostFor } from "../lib/client.ts";

/**
 * A **Manage Vanta** application, authenticating with the `client_credentials`
 * OAuth grant.
 *
 * No browser sign-in, which is what makes it work in a scheduled run. The
 * application is created in Vanta's Developer Console and its client id and
 * secret are exchanged for a one-hour access token.
 *
 * ## One active token per application — the constraint that shapes everything
 *
 * Vanta's own words: *"Requesting a new token with the same `client_id` /
 * `client_secret` immediately revokes the previous one — any in-flight requests
 * using the old token will fail with `401`."*
 *
 * That has consequences worth stating plainly, because they are invisible until
 * they bite:
 *
 *   - **Two connections built from the same application will fight.** Each
 *     refresh silently kills the other's token, and both fail with `401` at
 *     unpredictable times. If two workflows need Vanta, give them two
 *     applications.
 *   - The same is true of anything *else* using those credentials — a CI job, a
 *     script, a colleague's laptop.
 *   - So this app mints a token in `exchange` and again only in `refresh`, and
 *     never per request. The runtime holds it for its hour.
 *
 * ## And the token endpoint is rate limited at 5 per minute
 *
 * Which makes minting-per-request impossible anyway, and is the reason
 * `expiresAt` is recorded with a minute of headroom rather than refreshing
 * optimistically.
 *
 * ## Scopes are requested at token time
 *
 * Unlike most APIs, the scope is a parameter of the token request rather than a
 * property of the credential. `vanta-api.all:read` is the safe default and what
 * this app needs for everything except the four write actions; asking for a
 * scope the application was not created for returns `invalid_scope` and fails
 * the whole exchange.
 */
async function mintToken(
  ctx: Parameters<NonNullable<AuthDefinition["refresh"]>>[1],
  creds: { region?: string; clientId: string; clientSecret: string; scope?: string },
): Promise<Record<string, unknown>> {
  const region = String(creds.region ?? "commercial");
  const host = hostFor(region);
  const scope = String(creds.scope ?? "").trim() || "vanta-api.all:read";

  const res = await ctx.fetch(`${host}/oauth/token`, {
    method: "POST",
    headers: { "content-type": "application/json", accept: "application/json" },
    body: JSON.stringify({
      grant_type: "client_credentials",
      client_id: creds.clientId,
      client_secret: creds.clientSecret,
      scope,
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
      `Vanta refused to mint a token (${reason}). Check the client id and secret, that the ` +
        "application is a Manage Vanta application, and that the requested scope matches what it " +
        "was created for — a mismatch returns `invalid_scope`. Note that the token endpoint " +
        "allows only 5 requests a minute.",
    );
  }
  return {
    ...creds,
    region,
    scope,
    accessToken: body.access_token,
    // A minute of headroom, because re-minting is limited to 5 a minute and a
    // late refresh cannot simply be retried.
    expiresAt: new Date(Date.now() + ((body.expires_in ?? 3600) - 60) * 1000).toISOString(),
  };
}

const clientCredentials: AuthDefinition = {
  key: "client-credentials",
  type: "custom",
  displayName: "Manage Vanta Application",
  description:
    "A Manage Vanta application's client id and secret, exchanged for a one-hour token. Vanta " +
    "allows ONE active token per application — a second consumer of these credentials will " +
    "silently revoke this one.",
  connectionLabel: "Vanta ({{region}})",
  fields: [
    {
      key: "clientId",
      label: "Client ID",
      type: "secret",
      required: true,
      row: "client",
      hint: "Vanta → Settings → Developer Console → your Manage Vanta application.",
    },
    {
      key: "clientSecret",
      label: "Client Secret",
      type: "secret",
      required: true,
      row: "client",
    },
    {
      key: "region",
      label: "Region",
      type: "select",
      default: "commercial",
      options: [
        { value: "commercial", label: "Commercial — api.vanta.com" },
        { value: "gov", label: "Vanta Gov (FedRAMP) — api.vanta-gov.com" },
      ],
      hint: "Vanta Gov has its own token endpoint as well as its own API host; a credential for " +
        "one is unknown to the other.",
    },
    {
      key: "scope",
      label: "Scope",
      type: "string",
      default: "vanta-api.all:read",
      hint: "Space-separated, requested at token time. `vanta-api.all:read` covers every read " +
        "action here; add `vanta-api.all:write` only if the workflow assigns owners, offboards " +
        "people or deactivates test entities. Asking for a scope the application was not created " +
        "for fails the whole exchange.",
    },
  ],

  /** Turns the pasted credentials into a live token. */
  exchange({ fields }, ctx) {
    const { clientId, clientSecret, region, scope } = (fields ?? {}) as Record<string, string>;
    if (!clientId || !clientSecret) {
      throw new Error("Client ID and Client Secret are both required.");
    }
    // Fail here, with an explanation, rather than at the sandbox's egress check.
    hostFor(region);
    return mintToken(ctx, { clientId, clientSecret, region, scope });
  },

  /**
   * The same call again — the credential is the id and secret, and Vanta issues
   * no refresh token.
   */
  refresh({ credential }, ctx) {
    const { clientId, clientSecret, region, scope } = credential as Record<string, string>;
    return mintToken(ctx, { clientId, clientSecret, region, scope });
  },

  sign({ request, credential }) {
    const { accessToken } = credential as { accessToken: string };
    request.headers["authorization"] = `Bearer ${accessToken}`;
    return request;
  },

  /**
   * `GET /v1/frameworks?pageSize=1` — the cheapest call that proves the token
   * works against this tenant.
   *
   * Frameworks are chosen deliberately: every Vanta tenant has at least one,
   * and reading them needs only the base read scope, so a `403` here means the
   * scope is wrong rather than that the tenant is empty.
   */
  async test({ credential }, ctx) {
    const { accessToken, region, scope } = credential as Record<string, string>;
    if (!accessToken) return { ok: false, message: "credential missing accessToken" };
    const host = hostFor(region);

    let res: Response;
    try {
      res = await ctx.fetch(`${host}${API_PATH}/frameworks?pageSize=1`, {
        headers: { authorization: `Bearer ${accessToken}`, accept: "application/json" },
      });
    } catch (err) {
      return { ok: false, message: `could not reach ${host}: ${String(err)}` };
    }

    if (res.status === 401) {
      await res.body?.cancel();
      return {
        ok: false,
        message: "Vanta rejected this token — it may have expired, or something else may have " +
          "minted a token for the same application, which revokes this one",
      };
    }
    if (res.status === 403) {
      await res.body?.cancel();
      return {
        ok: false,
        message: `the token is valid but its scope (${scope ?? "unset"}) does not permit reading ` +
          "frameworks",
      };
    }
    if (!res.ok) {
      await res.body?.cancel();
      return { ok: false, message: `Vanta returned ${res.status}` };
    }

    const body = await res.json().catch(() => null) as
      | { results?: { data?: Array<{ name?: string }> } }
      | null;
    const frameworks = body?.results?.data ?? [];
    return {
      ok: true,
      message: frameworks.length > 0
        ? `connected to a ${region ?? "commercial"} tenant tracking ${
          frameworks[0]?.name ?? "at least one framework"
        }`
        : `connected to a ${region ?? "commercial"} tenant with no frameworks configured yet`,
    };
  },

  /** Records the region. Never the credentials or the token. */
  afterConnect({ credential }) {
    const { region } = credential as Record<string, string>;
    return { region: region ?? "commercial" };
  },
};

export default clientCredentials;

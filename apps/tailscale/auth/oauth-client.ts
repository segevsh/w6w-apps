import type { AuthDefinition } from "@w6w/types";
import { API, describeError } from "../lib/client.ts";

/**
 * An OAuth client — a *trust credential*, `tskey-client-…`.
 *
 * ## This is the one to use for automation
 *
 * Three differences from an API access token, and all three matter for
 * something a workflow depends on:
 *
 * - **It does not expire.** A user's API token dies after at most 90 days.
 * - **It is not a person.** It belongs to the tailnet, so it survives whoever
 *   created it leaving, and it does not inherit their role.
 * - **It is scoped.** `devices:core:read` grants exactly that. A token that
 *   can only read devices cannot delete one, which an API token belonging to
 *   an admin certainly can.
 *
 * ## The access tokens it mints last an hour
 *
 * `POST /api/v2/oauth/token` with the client id and secret, form-encoded,
 * returns a short-lived bearer token. The runtime refreshes it; a 401 in the
 * middle of a run is more often a refresh that did not happen than a
 * credential somebody revoked.
 *
 * ## A scope missing at creation cannot be added later
 *
 * Scopes are fixed when the client is made. Adding one means a new client, and
 * the symptom of a missing scope is a 403 on one endpoint while everything
 * else keeps working — which reads as an outage of that one feature.
 */
const auth: AuthDefinition = {
  key: "oauth-client",
  type: "custom",
  displayName: "OAuth client",
  connectionLabel: "{{tailnet}} — {{credentialKind}}",
  description:
    "A `tskey-client-…` trust credential. Unlike an API token it NEVER EXPIRES, belongs to the " +
    "tailnet rather than to a person, and is SCOPED — so it is the right credential for " +
    "anything long-lived. Scopes are fixed at creation and a missing one shows up as a 403 on " +
    "one endpoint.",
  fields: [
    {
      key: "clientId",
      label: "Client ID",
      type: "string",
      required: true,
      hint: "Admin console → Settings → OAuth clients.",
    },
    {
      key: "clientSecret",
      label: "Client secret",
      type: "secret",
      required: true,
      hint: "Starts with `tskey-client-`. Shown once, at creation.",
    },
    {
      key: "tailnet",
      label: "Tailnet",
      type: "string",
      default: "-",
      advanced: true,
      hint: "`-` means the client's own tailnet, which is right for almost everybody.",
    },
  ],

  async exchange({ fields }, ctx) {
    const clientId = String((fields as Record<string, unknown>)?.clientId ?? "").trim();
    const clientSecret = String((fields as Record<string, unknown>)?.clientSecret ?? "").trim();
    const tailnet = String((fields as Record<string, unknown>)?.tailnet ?? "-").trim() || "-";
    if (!clientId || !clientSecret) {
      throw new Error("`clientId` and `clientSecret` are both required");
    }

    const token = await mint(clientId, clientSecret, ctx.fetch);
    return {
      clientId,
      clientSecret,
      tailnet,
      accessToken: token.accessToken,
      expiresAt: token.expiresAt,
    };
  },

  async refresh({ credential }, ctx) {
    const fields = credential as Record<string, unknown>;
    const token = await mint(
      String(fields?.clientId ?? ""),
      String(fields?.clientSecret ?? ""),
      ctx.fetch,
    );
    return { ...fields, accessToken: token.accessToken, expiresAt: token.expiresAt };
  },

  sign({ request, credential }) {
    const accessToken = String((credential as Record<string, unknown>)?.accessToken ?? "");
    return {
      ...request,
      headers: { ...request.headers, authorization: `Bearer ${accessToken}` },
    };
  },

  async test({ credential }, ctx) {
    const fields = credential as Record<string, unknown>;
    const tailnet = String(fields?.tailnet ?? "-") || "-";
    let res: Response;
    try {
      res = await ctx.fetch(`${API}/tailnet/${encodeURIComponent(tailnet)}/devices`, {
        headers: { accept: "application/json" },
      });
    } catch (err) {
      return { ok: false, message: `could not reach the Tailscale API: ${String(err)}` };
    }
    const text = await res.text().catch(() => "");
    if (res.status === 403) {
      return {
        ok: false,
        message: "the client authenticated and is not permitted to list devices — it is missing " +
          "the `devices:core:read` scope, and a scope cannot be added to an existing OAuth " +
          "client. A new client is the only fix",
      };
    }
    if (!res.ok) {
      return {
        ok: false,
        message: describeError(res.status, text, res.headers.get("x-tailscale-request-id")),
      };
    }

    let devices: unknown[] = [];
    try {
      devices = (JSON.parse(text) as { devices?: unknown[] })?.devices ?? [];
    } catch { /* an empty tailnet is still a working credential */ }

    return {
      ok: true,
      message: `reached tailnet ${tailnet === "-" ? "(the client's own)" : tailnet} — ` +
        `${devices.length} device${devices.length === 1 ? "" : "s"}. This client does not ` +
        "expire; the access tokens it mints last an hour and are refreshed automatically",
    };
  },

  afterConnect({ credential }) {
    const fields = credential as Record<string, unknown>;
    return {
      tailnet: String(fields?.tailnet ?? "-") || "-",
      clientId: String(fields?.clientId ?? ""),
      credentialKind: "OAuth client",
    };
  },
};

/** POST the client credentials, form-encoded, and read the short-lived token. */
async function mint(
  clientId: string,
  clientSecret: string,
  fetchImpl: (input: string, init?: RequestInit) => Promise<Response>,
): Promise<{ accessToken: string; expiresAt: string }> {
  const body = new URLSearchParams({
    grant_type: "client_credentials",
    client_id: clientId,
    client_secret: clientSecret,
  });

  const res = await fetchImpl(`${API}/oauth/token`, {
    method: "POST",
    headers: {
      "content-type": "application/x-www-form-urlencoded",
      accept: "application/json",
    },
    body: body.toString(),
  });
  const text = await res.text().catch(() => "");
  if (!res.ok) {
    throw new Error(
      `Tailscale ${res.status} minting an access token: ${
        describeError(res.status, text, res.headers.get("x-tailscale-request-id"))
      }`,
    );
  }

  interface TokenResponse {
    access_token?: string;
    expires_in?: number;
  }
  let token: TokenResponse;
  try {
    token = JSON.parse(text) as TokenResponse;
  } catch {
    throw new Error(`Tailscale did not return a token: ${text.slice(0, 160)}`);
  }
  if (!token.access_token) {
    throw new Error("Tailscale returned no `access_token` for these client credentials");
  }

  // The spec's tokens last an hour; a missing expiry is treated as one.
  const seconds = Number(token.expires_in ?? 3600) || 3600;
  return {
    accessToken: token.access_token,
    expiresAt: new Date(Date.now() + seconds * 1000).toISOString(),
  };
}

export default auth;

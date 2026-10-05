import type { AuthDefinition } from "@w6w/types";
import { describeError, normalizeRegion, type Region, REGIONS } from "../lib/client.ts";

/**
 * An organization API key — `client_id` / `client_secret` exchanged for a bearer
 * token (OAuth2 client credentials, scope `api.organization`).
 *
 * ## The key is the organization's, not a person's
 *
 * Organization keys have a `client_id` of the form `organization.<uuid>`. A
 * personal API key (`user.<uuid>`) is a different credential for the Vault
 * Management API and is refused here. Only an organization **owner** can see the
 * key (Admin Console → Settings → Organization info → API key), and rotating it
 * invalidates every connection built on it.
 *
 * ## Tokens last 60 minutes
 *
 * `expires_in` is 3600. The connection stores the key and lets the runtime's
 * `refresh` mint tokens, expiring them a little early.
 *
 * ## The token endpoint answers 400 for a bad key, not 401
 *
 * Measured live on both regions: a wrong `client_id`/`client_secret` returns
 * `400 {"error":"invalid_client"}`. The check is on the body's `error` code.
 */
const auth: AuthDefinition = {
  key: "client-credentials",
  type: "custom",
  displayName: "Organization API key",
  connectionLabel: "{{regionLabel}} — {{clientId}}",
  description:
    "An organization's API key (client id and secret). Only an organization owner can view it: " +
    "Admin Console → Settings → Organization info → API key. It is NOT the personal API key.",
  fields: [
    {
      key: "region",
      label: "Region",
      type: "select",
      required: true,
      default: "us",
      options: [
        { value: "us", label: "US cloud (bitwarden.com)" },
        { value: "eu", label: "EU cloud (bitwarden.eu)" },
      ],
      hint: "The region the organization was created in. US and EU are separate stacks — a " +
        "key from one does not work on the other. Self-hosted servers are not supported.",
    },
    {
      key: "clientId",
      label: "Client ID",
      type: "string",
      required: true,
      placeholder: "organization.xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx",
    },
    { key: "clientSecret", label: "Client secret", type: "secret", required: true },
  ],

  async exchange({ fields }, ctx) {
    const values = fields as Record<string, unknown>;
    const region = normalizeRegion(values?.region);
    const clientId = String(values?.clientId ?? "").trim();
    const clientSecret = String(values?.clientSecret ?? "").trim();
    if (!clientId || !clientSecret) {
      throw new Error("`clientId` and `clientSecret` are both required");
    }
    if (clientId.startsWith("user.")) {
      throw new Error(
        "That is a personal API key (`user.…`). The Public API needs the ORGANIZATION key " +
          "(`organization.…`), found by an owner under Settings → Organization info → API key",
      );
    }
    const token = await mint(region, clientId, clientSecret, ctx.fetch);
    return { region, clientId, clientSecret, ...token };
  },

  async refresh({ credential }, ctx) {
    const c = credential as Record<string, unknown>;
    const token = await mint(
      normalizeRegion(c?.region),
      String(c?.clientId ?? ""),
      String(c?.clientSecret ?? ""),
      ctx.fetch,
    );
    return { ...c, ...token };
  },

  // The only code handed the credential. Network-less: stamp and return.
  sign({ request, credential }) {
    const accessToken = String((credential as Record<string, unknown>)?.accessToken ?? "");
    return {
      ...request,
      headers: { ...request.headers, authorization: `Bearer ${accessToken}` },
    };
  },

  async test({ credential }, ctx) {
    const c = credential as Record<string, unknown>;
    const region = normalizeRegion(c?.region);
    // Policies: a short, bounded list that needs nothing beyond the org key, and whose
    // body holds no credential. Collections/members grow with the organization.
    const url = `${REGIONS[region].api}/public/policies`;
    let res: Response;
    try {
      res = await ctx.fetch(url, { headers: { accept: "application/json" } });
    } catch (err) {
      return { ok: false, message: `could not reach ${new URL(url).host}: ${String(err)}` };
    }
    const text = await res.text().catch(() => "");
    if (!res.ok) return { ok: false, message: describeError(res.status, text) };
    return {
      ok: true,
      message: `authenticated against the ${REGIONS[region].label} (${new URL(url).host})`,
    };
  },

  afterConnect({ credential }) {
    const c = credential as Record<string, unknown>;
    const region: Region = normalizeRegion(c?.region);
    return {
      region,
      regionLabel: REGIONS[region].label,
      clientId: String(c?.clientId ?? ""),
    };
  },
};

/** `POST {identity}/connect/token`, form-encoded — JSON is not accepted there. */
async function mint(
  region: Region,
  clientId: string,
  clientSecret: string,
  fetchImpl: (input: string, init?: RequestInit) => Promise<Response>,
): Promise<{ accessToken: string; expiresAt: string }> {
  const res = await fetchImpl(`${REGIONS[region].identity}/connect/token`, {
    method: "POST",
    headers: { "content-type": "application/x-www-form-urlencoded", accept: "application/json" },
    body: new URLSearchParams({
      grant_type: "client_credentials",
      scope: "api.organization",
      client_id: clientId,
      client_secret: clientSecret,
    }).toString(),
  });
  const text = await res.text().catch(() => "");

  interface TokenResponse {
    access_token?: string;
    expires_in?: number;
    error?: string;
    error_description?: string;
  }
  let token: TokenResponse = {};
  try {
    token = JSON.parse(text) as TokenResponse;
  } catch { /* handled below */ }

  // Classify from the body's own error code; the status is only a hint.
  if (token.error) {
    const hint = token.error === "invalid_client"
      ? " — the client id/secret pair was rejected: wrong region, a rotated key, or a personal " +
        "(`user.…`) key instead of the organization key"
      : "";
    throw new Error(
      `Bitwarden refused the token request (${res.status} ${token.error}` +
        `${token.error_description ? `: ${token.error_description}` : ""})${hint}`,
    );
  }
  if (!res.ok) {
    throw new Error(`Bitwarden ${res.status} minting a token: ${text.slice(0, 160)}`);
  }
  if (!token.access_token) throw new Error("Bitwarden returned no `access_token`");

  const seconds = Number(token.expires_in ?? 3600) || 3600;
  const early = Math.max(60, seconds - 120);
  return {
    accessToken: token.access_token,
    expiresAt: new Date(Date.now() + early * 1000).toISOString(),
  };
}

export default auth;

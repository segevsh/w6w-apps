/**
 * Key-Pair JWT (`custom`) — RSA key-pair authentication against the Snowflake
 * SQL API v2, per `docs.snowflake.com/en/developer-guide/sql-api/authenticating`
 * and `docs.snowflake.com/en/user-guide/key-pair-auth`.
 *
 * Chosen over OAuth2 for this app:
 *
 *   - **No redirect flow.** Snowflake's OAuth2 also requires a per-account
 *     "Security Integration" the account admin must create by hand before any
 *     client can authorize — there is no generic authorize/token URL an app
 *     can ship (n8n's own `SnowflakeOAuth2Api` credential documents this: the
 *     account admin registers the integration and hands the app a client
 *     id/secret out of band). Key-pair auth needs only
 *     `ALTER USER … SET RSA_PUBLIC_KEY = '…'` — one SQL statement, no w6w-side
 *     OAuth client registration, no browser round trip.
 *   - **Fits the network-less `sign` hook perfectly.** Minting the bearer
 *     credential is pure local RSA signing (WebCrypto `RSASSA-PKCS1-v1_5`,
 *     `lib/jwt.ts`) — no token endpoint to call, so a fresh JWT can be minted
 *     on every `sign` call with no `refresh` hook and no cached-token
 *     expiry to manage. A stored key-pair credential does not itself expire.
 *
 * Fields collected: `account` (identifies the host, exactly like Zendesk's
 * subdomain — see `lib/client.ts`), `username`, and `privateKey` (unencrypted
 * PKCS8 PEM; encrypted keys are rejected with a clear error — see
 * `lib/jwt.ts` for why decrypting PBES2-wrapped PKCS8 was left out of scope).
 */
import type { AuthDefinition } from "@w6w/types";
import { baseUrl, STATEMENTS_PATH } from "../lib/client.ts";
import { signKeyPairJwt } from "../lib/jwt.ts";

interface KeyPairFields {
  account?: string;
  username?: string;
  privateKey?: string;
}

const keyPair: AuthDefinition = {
  key: "key-pair",
  type: "custom",
  displayName: "Key Pair (JWT)",
  description:
    "RSA key-pair authentication. Generate a key pair, assign the public key to your Snowflake " +
    "user with `ALTER USER <user> SET RSA_PUBLIC_KEY='…'`, then paste the unencrypted private " +
    "key PEM here. See docs.snowflake.com/en/user-guide/key-pair-auth.",
  connectionLabel: "{{username}}@{{account}}",
  fields: [
    {
      key: "account",
      label: "Account identifier",
      type: "string",
      required: true,
      row: "identity",
      placeholder: "myorg-myaccount",
      hint: "The identifier from your account URL, e.g. `myorg-myaccount` for " +
        "https://myorg-myaccount.snowflakecomputing.com, or the legacy `xy12345.us-east-1` form.",
    },
    { key: "username", label: "Username", type: "string", required: true, row: "identity" },
    {
      key: "privateKey",
      label: "Private Key (PKCS8 PEM)",
      type: "secret",
      required: true,
      hint: "Unencrypted PKCS8 PEM (`-----BEGIN PRIVATE KEY-----`). Generate with " +
        "`openssl genrsa 2048 | openssl pkcs8 -topk8 -inform PEM -out rsa_key.p8 -nocrypt`, then " +
        "register the matching public key on the Snowflake user. Encrypted keys are not supported.",
    },
  ],

  /**
   * The ONLY hook given the raw credential. Mints a fresh JWT per request —
   * pure local RSA signing, no network access — and stamps it on the request
   * exactly the way a bearer token would be.
   */
  async sign({ request, credential }) {
    const { account, username, privateKey } = credential as Required<KeyPairFields>;
    const jwt = await signKeyPairJwt({ account, username, privateKey });
    request.headers["authorization"] = `Bearer ${jwt}`;
    // Documented as optional, but unambiguous: this connection only ever
    // presents a key-pair JWT, never an OAuth token.
    request.headers["x-snowflake-authorization-token-type"] = "KEYPAIR_JWT";
    return request;
  },

  /**
   * Validates the JWT is accepted by submitting the cheapest statement that
   * still exercises real auth: `SELECT 1`. Deliberately NOT a liveness check
   * of query execution — Snowflake requires an active warehouse to run *any*
   * statement (even a bare literal), and this auth method collects no
   * warehouse (that's a per-Action param, since different actions may target
   * different ones). So a 401/403 here means the JWT itself was rejected
   * (Snowflake's own vendor code 390144, "JWT token is invalid" — a
   * fingerprint/account/user mismatch); any other response, including a 422
   * "no active warehouse" SQL error, proves the JWT was accepted and the
   * request reached the SQL execution layer, which is the credential-liveness
   * question this hook answers.
   */
  async test({ credential }, ctx) {
    const { account, username, privateKey } = (credential ?? {}) as KeyPairFields;
    if (!account || !username || !privateKey) {
      return { ok: false, message: "credential missing account, username or privateKey" };
    }
    let jwt: string;
    try {
      jwt = await signKeyPairJwt({ account, username, privateKey });
    } catch (err) {
      return { ok: false, message: (err as Error).message };
    }
    const res = await ctx.fetch(`${baseUrl(account)}${STATEMENTS_PATH}`, {
      method: "POST",
      headers: {
        authorization: `Bearer ${jwt}`,
        "x-snowflake-authorization-token-type": "KEYPAIR_JWT",
        "content-type": "application/json",
        accept: "application/json",
      },
      body: JSON.stringify({ statement: "SELECT 1" }),
    });
    if (res.status === 401 || res.status === 403) {
      const body = await res.text().catch(() => "");
      return { ok: false, message: `Snowflake rejected the key-pair JWT (${res.status}): ${body}` };
    }
    return { ok: true };
  },

  /**
   * Records `account`/`username` on the connection so `lib/client.ts` can
   * build request URLs without ever seeing the credential. No extra network
   * call: `test` already proved the JWT is accepted, and there is no
   * unauthenticated "whoami" cheaper than the statement `test` already ran.
   */
  afterConnect({ credential }) {
    const { account, username } = (credential ?? {}) as KeyPairFields;
    return { account: account?.trim(), username: username?.trim() };
  },
};

export default keyPair;

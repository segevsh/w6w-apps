# Snowflake

Run SQL against Snowflake via the **SQL API v2** — a real HTTPS REST API (not the wire-protocol
driver most tools use), so this app needs no scoping compromise for w6w's network-less,
`ctx.fetch`-only sandbox.

- **Categories** — data-warehousing
- **Auth methods** — key-pair (RSA key-pair JWT)
- **Actions** — 5
- **Egress allowlist** — `*.snowflakecomputing.com`

## Setup

Every Snowflake account has its own host — `https://<account_identifier>.snowflakecomputing.com`
— so the account identifier is collected at connect time, the same way Zendesk collects a
subdomain. Find yours in your account URL (`myorg-myaccount` in
`https://myorg-myaccount.snowflakecomputing.com`), or use the legacy
`<locator>.<region>.<cloud>` form if that's what your account still uses.

### Auth: RSA key-pair JWT

1. Generate an RSA key pair (2048-bit minimum):
   ```
   openssl genrsa 2048 | openssl pkcs8 -topk8 -inform PEM -out rsa_key.p8 -nocrypt
   openssl rsa -in rsa_key.p8 -pubout -out rsa_key.pub
   ```
2. Register the public key on your Snowflake user (paste the key body, without the
   `-----BEGIN/END-----` delimiters):
   ```sql
   ALTER USER my_user SET RSA_PUBLIC_KEY='MIIBIjANBgkqh...';
   ```
3. Connect this app with your **account identifier**, **username**, and the contents of
   `rsa_key.p8` (the *private* key) pasted into the Private Key field.

Full walkthrough: <https://docs.snowflake.com/en/user-guide/key-pair-auth>.

#### Why key-pair JWT instead of OAuth2

Snowflake supports both, but they were not equally implementable here:

- **OAuth2 has no generic authorize/token URL an app can ship.** Snowflake's OAuth requires the
  account admin to first create a per-account "Security Integration" and hand the app a
  client id/secret out of band — n8n's own `SnowflakeOAuth2Api` credential documents exactly
  this. There is no `https://snowflakecomputing.com/oauth/authorize` this app could declare
  once for every account, unlike Zendesk's per-subdomain-but-otherwise-generic OAuth flow.
- **Key-pair auth is one SQL statement to set up** (`ALTER USER … SET RSA_PUBLIC_KEY=…`) and
  needs no browser redirect.
- **It fits the network-less `sign` hook exactly.** Minting the credential is pure local RSA
  signing (`lib/jwt.ts`, WebCrypto `RSASSA-PKCS1-v1_5`) — no token endpoint to call, so `sign`
  mints a fresh JWT on every request with no cached-token expiry and no `refresh` hook. A stored
  key-pair credential does not itself expire the way an OAuth access token does.

**Limitation:** only unencrypted PKCS8 private keys are supported. Decrypting an
encrypted PKCS8 key (PBES2/PBKDF2 + DES3 or AES) needs an ASN.1-aware decryption step this app
doesn't implement — `lib/jwt.ts` rejects an encrypted key with a clear error rather than
pretending to support it.

### The JWT claim shape

Per <https://docs.snowflake.com/en/developer-guide/sql-api/authenticating>:

```
header = { alg: "RS256", typ: "JWT" }
claim  = {
  iss: "<ACCOUNT>.<USER>.SHA256:<public-key-fingerprint>",
  sub: "<ACCOUNT>.<USER>",
  iat: <seconds>,
  exp: <seconds>,   // Snowflake hard-caps validity at 1h regardless of exp
}
```

`ACCOUNT` and `USER` are uppercased; periods in the account identifier (the legacy
`locator.region.cloud` form) are replaced with hyphens. The fingerprint is derived from the
private key without manual DER/ASN.1 encoding: WebCrypto exports the imported private key's
public components (`n`, `e`) as a JWK, re-imports them as a public key, and `exportKey("spki", …)`
produces exactly the DER `SubjectPublicKeyInfo` Snowflake itself hashes.

## The async execution model

Snowflake executes a submitted statement synchronously for up to ~45 seconds. A statement that
takes longer — or one submitted with **Run Asynchronously** — comes back `status: "running"` with
a `statementHandle` instead of results:

```
Execute SQL Statement  ──►  200 (complete, results in `data`/`rows`)
                        └─►  202 (running, statementHandle) ──► Get Statement Status/Results
                                                                    ├─► 200 (complete)
                                                                    ├─► 202/429 (still running)
                                                                    └─► poll again
```

`Get Statement Status / Results` treats **both** 202 and 429 as "still running" for that one
endpoint — Snowflake documents 429 there as an alternate "not finished yet" code, distinct from
429 on submission, which is real rate-limiting. Large result sets are split into partitions
(`resultSetMetaData.partitionInfo`); pass the `partition` param to fetch pages after the first.

## Actions

| Key | Type | What it does |
|---|---|---|
| `statement-execute` | perform | Submit a SQL statement (with warehouse/database/schema/role/bindings). |
| `statement-get` | read | Poll a statement's status/results by handle; supports result partitions. |
| `statement-cancel` | perform | Cancel a running statement by handle. |
| `database-list` | read | `SHOW DATABASES` (optionally `LIKE`-filtered), returned as rows. |
| `warehouse-list` | read | `SHOW WAREHOUSES` (optionally `LIKE`-filtered), returned as rows. |

`database-list`/`warehouse-list` collect no `warehouse` param: `SHOW …` commands are metadata-only
and, unlike a data query, do not require an active warehouse.

Deliberately narrow: the SQL API is a statement-execution surface, not a CRUD one, so there is no
invented breadth beyond submit/poll/cancel plus the two `SHOW` convenience wrappers.

## Health check

Three different questions get confused with each other, so this section keeps them apart: is the
*vendor* up, is *this credential* live, and do we have *quota* left.

### Is the vendor up?

**Service status** — <https://status.snowflake.com>, Statuspage.io-powered. Declared as a `feed`
(`/history.atom`) rather than hand-parsed: the host fetches and parses it, this app only
interprets what an entry means (Statuspage.io prefixes each update with the status word —
`Resolved - …`, `Investigating - …` — so an incident whose *newest* update isn't `Resolved` is
still open).

### Is this credential live?

The Auth `test` hook — the app's own health check, and the only one of the three it performs
itself. `SELECT 1` (no warehouse) via `POST /api/v2/statements`: a 401/403 means the JWT itself
was rejected (vendor code 390144, "JWT token is invalid"); anything else — including a 422
"no active warehouse" SQL error — proves the JWT was accepted, which is the question this hook
answers. It cannot also prove *query* liveness, because Snowflake requires an active warehouse to
run any statement (even a bare literal), and this auth method deliberately collects no warehouse
— that's a per-Action param, since different actions may target different ones.

An additional `account` check (`kind: "dependency"`, `credential: "context"`) asks a narrower
question: is *this connection's account host* reachable at all, independent of any credential —
an unauthenticated POST to `/api/v2/statements` that expects a 401 as a pass.

### Do we have quota left?

**Not implemented — no verifiable mechanism found.** Snowflake's SQL API returns a plain `429`
on rate-limiting with no documented `RateLimit-*`/`Retry-After` headers or a quota-inspection
endpoint (unlike Zendesk's `ratelimit-remaining` or GitHub's `/rate_limit`). Declaring a `quota`
check without a real signal to read would be inventing one, so this app ships none.

## Declared health checks

Per [`rfcs/healthcheck.md`](https://github.com/w6w-io/w6w-core/blob/main/rfcs/healthcheck.md).

| Key | Kind | Scope | Credential | Severity | Min interval | Probe |
|---|---|---|---|---|---|---|
| `service` | service | app | none | degraded | 300s | `health/service.ts` (feed) |
| `account` | dependency | connection | context | degraded | 120s | `health/account.ts` |
| `auth:key-pair` | credential | connection | signed | fatal | — | derived from the `key-pair` auth method's `test` hook |

No `quota` check is declared — see above.

---

Researched and endpoint-verified 2026-07-31 against Snowflake's own documentation
(`docs.snowflake.com`). Re-verify against a live account if a probe starts failing for everyone
at once; this app was built without one available.

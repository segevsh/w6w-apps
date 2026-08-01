/**
 * Snowflake key-pair JWT signing — RFC 7519 assertions signed with an RSA
 * private key, exactly as `docs.snowflake.com/en/developer-guide/sql-api/authenticating`
 * and `docs.snowflake.com/en/user-guide/key-pair-auth` specify:
 *
 *   header = { alg: "RS256", typ: "JWT" }
 *   claim  = {
 *     iss: "<ACCOUNT>.<USER>.SHA256:<public-key-fingerprint>",
 *     sub: "<ACCOUNT>.<USER>",
 *     iat: <seconds>,
 *     exp: <seconds>,       // Snowflake hard-caps validity at 1h regardless of exp
 *   }
 *
 * Two case/format rules the docs call out explicitly:
 *   - `ACCOUNT` and `USER` MUST be uppercase.
 *   - if the account identifier contains periods (the legacy
 *     `<locator>.<region>.<cloud>` form), they MUST be replaced with hyphens —
 *     a literal `.` inside `iss`/`sub` breaks the claim's dotted structure.
 *
 * All of this is pure local computation — RSA signing via WebCrypto, no
 * network access — so it fits the network-less `sign` hook exactly the way
 * SigV4 or a bearer-token stamp would, just with an extra local hashing step
 * to derive the public-key fingerprint that names the key in `iss`.
 *
 * Deriving the fingerprint: Snowflake computes it as
 * `SHA256:` + base64(SHA-256(DER-encoded SubjectPublicKeyInfo of the PUBLIC
 * key)). We only ever receive the PRIVATE key, so the public key is derived
 * from it without any manual ASN.1/DER encoding: WebCrypto can export an
 * imported private key as a JWK (which carries the public `n`/`e`
 * components), and re-importing just `{ n, e }` as a public JWK lets
 * `exportKey("spki", …)` produce exactly the DER SubjectPublicKeyInfo
 * Snowflake hashes.
 */

const encoder = new TextEncoder();

export interface KeyPairCredential {
  account: string;
  username: string;
  /** PKCS8 PEM, unencrypted. `\n`-escaped strings (as pasted into a form field) are normalized. */
  privateKey: string;
}

function base64FromBytes(bytes: ArrayBuffer | Uint8Array): string {
  const arr = bytes instanceof Uint8Array ? bytes : new Uint8Array(bytes);
  let binary = "";
  for (const b of arr) binary += String.fromCharCode(b);
  return btoa(binary);
}

function base64Url(bytes: ArrayBuffer | Uint8Array): string {
  return base64FromBytes(bytes).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

/**
 * Snowflake's normalization for the `iss`/`sub` account segment: uppercase,
 * periods replaced with hyphens (the legacy `locator.region.cloud` form is
 * the only shape that has periods in practice).
 */
export function normalizeAccountForJwt(account: string): string {
  return account.trim().toUpperCase().replace(/\./g, "-");
}

/** Snowflake's normalization for the `iss`/`sub` user segment: uppercase. */
export function normalizeUsernameForJwt(username: string): string {
  return username.trim().toUpperCase();
}

/** Strip `\n`-escapes (as pasted into a single-line form field) and surrounding whitespace. */
function normalizePem(pem: string): string {
  return pem.replace(/\\n/g, "\n").trim();
}

function pemToPkcs8(pem: string): ArrayBuffer {
  const normalized = normalizePem(pem);
  if (/-----BEGIN ENCRYPTED PRIVATE KEY-----/.test(normalized)) {
    throw new Error(
      "snowflake: encrypted private keys are not supported — provide the unencrypted PKCS8 PEM " +
        "(e.g. `openssl genrsa 2048 | openssl pkcs8 -topk8 -inform PEM -out rsa_key.p8 -nocrypt`).",
    );
  }
  const match = normalized.match(
    /-----BEGIN PRIVATE KEY-----([\s\S]+?)-----END PRIVATE KEY-----/,
  );
  if (!match) {
    throw new Error(
      "snowflake: privateKey must be an unencrypted PKCS8 PEM " +
        "(starting with `-----BEGIN PRIVATE KEY-----`). " +
        "A traditional `-----BEGIN RSA PRIVATE KEY-----` (PKCS1) key must be converted first: " +
        "`openssl pkcs8 -topk8 -inform PEM -in rsa_key.pem -out rsa_key.p8 -nocrypt`.",
    );
  }
  const base64 = match[1].replace(/\s+/g, "");
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return bytes.buffer;
}

async function importSigningKey(pkcs8: ArrayBuffer): Promise<CryptoKey> {
  try {
    return await crypto.subtle.importKey(
      "pkcs8",
      pkcs8,
      { name: "RSASSA-PKCS1-v1_5", hash: "SHA-256" },
      true, // extractable — needed to derive the public key for the fingerprint
      ["sign"],
    );
  } catch (err) {
    throw new Error(
      `snowflake: could not import privateKey as an RSA PKCS8 key (${
        (err as Error).message
      }). Only RSA key-pair auth is supported.`,
    );
  }
}

/**
 * `SHA256:<base64>` fingerprint of the RSA public key matching `privateKey`,
 * in the same form `ALTER USER … SET RSA_PUBLIC_KEY_FP` / the Snowsight UI
 * display it. Derived without manual DER encoding: export the private key's
 * public components as a JWK, re-import as a public key, and let WebCrypto
 * produce the DER SubjectPublicKeyInfo Snowflake itself hashes.
 */
export async function publicKeyFingerprint(privateKey: CryptoKey): Promise<string> {
  const jwk = await crypto.subtle.exportKey("jwk", privateKey);
  const publicKey = await crypto.subtle.importKey(
    "jwk",
    { kty: "RSA", n: jwk.n, e: jwk.e, ext: true },
    { name: "RSASSA-PKCS1-v1_5", hash: "SHA-256" },
    true,
    ["verify"],
  );
  const spki = await crypto.subtle.exportKey("spki", publicKey);
  const digest = await crypto.subtle.digest("SHA-256", spki);
  return `SHA256:${base64FromBytes(digest)}`;
}

/** Snowflake caps JWT validity at 1h regardless of `exp`; stay comfortably under that. */
const LIFETIME_SECONDS = 59 * 60;

/**
 * Build and RS256-sign a fresh Snowflake key-pair JWT. Pure local computation
 * — no network access — so it is safe to call from the network-less `sign`
 * hook, and cheap enough to call once per request rather than caching: a
 * stored key-pair credential never itself expires, unlike an OAuth token.
 */
export async function signKeyPairJwt(
  credential: KeyPairCredential,
  nowSeconds: number = Math.floor(Date.now() / 1000),
): Promise<string> {
  const privateKey = await importSigningKey(pemToPkcs8(credential.privateKey));
  const fingerprint = await publicKeyFingerprint(privateKey);
  const account = normalizeAccountForJwt(credential.account);
  const user = normalizeUsernameForJwt(credential.username);

  const header = { alg: "RS256", typ: "JWT" };
  const claim = {
    iss: `${account}.${user}.${fingerprint}`,
    sub: `${account}.${user}`,
    iat: nowSeconds,
    exp: nowSeconds + LIFETIME_SECONDS,
  };

  const signingInput = `${base64Url(encoder.encode(JSON.stringify(header)))}.${
    base64Url(encoder.encode(JSON.stringify(claim)))
  }`;
  const signature = await crypto.subtle.sign(
    "RSASSA-PKCS1-v1_5",
    privateKey,
    encoder.encode(signingInput),
  );
  return `${signingInput}.${base64Url(signature)}`;
}

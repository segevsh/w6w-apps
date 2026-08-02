/**
 * Ghost Admin API JWT signing — per `docs.ghost.org/admin-api` (Authentication)
 * and confirmed against Ghost's own reference client
 * (`github.com/TryGhost/SDK` → `packages/admin-api/lib/token.js`, which builds
 * the token with the `jsonwebtoken` npm package):
 *
 *   Admin API Key format: "<id>:<secret>" — id is 24 hex chars, secret is 64
 *   hex chars (the key shown verbatim in Ghost Admin → Settings →
 *   Integrations → a Custom Integration).
 *
 *   header = { alg: "HS256", typ: "JWT", kid: "<id>" }
 *   claim  = { iat: <now, seconds>, exp: <now + 5min>, aud: "/admin/" }
 *
 *   signature = HMAC-SHA256(header.claim, hex-decoded secret bytes)
 *
 * Ghost hard-caps the token at 5 minutes (a token minted with a longer `exp`
 * is rejected), so a fresh token is minted on every `sign` call rather than
 * cached — pure local HMAC computation, no network access, which is exactly
 * what the network-less `sign` hook is for (see Snowflake's `lib/jwt.ts` for
 * the same pattern with RSA instead of HMAC).
 */

const encoder = new TextEncoder();

export interface AdminApiKey {
  id: string;
  secret: string;
}

const RE_KEY = /^([0-9a-f]{24}):([0-9a-f]{64})$/i;

/** Split and validate a pasted Admin API Key into its `id`/`secret` halves. */
export function parseAdminApiKey(raw: string): AdminApiKey {
  const match = RE_KEY.exec(raw.trim());
  if (!match) {
    throw new Error(
      "ghost: apiKey must be the Admin API Key shown in Ghost Admin → Settings → Integrations " +
        "→ (your custom integration), in the form `<24 hex chars>:<64 hex chars>`.",
    );
  }
  return { id: match[1], secret: match[2] };
}

function hexToBytes(hex: string): Uint8Array {
  const bytes = new Uint8Array(hex.length / 2);
  for (let i = 0; i < bytes.length; i++) {
    bytes[i] = parseInt(hex.slice(i * 2, i * 2 + 2), 16);
  }
  return bytes;
}

function base64Url(bytes: ArrayBuffer | Uint8Array): string {
  const arr = bytes instanceof Uint8Array ? bytes : new Uint8Array(bytes);
  let binary = "";
  for (const b of arr) binary += String.fromCharCode(b);
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

/** Ghost rejects a token whose `exp` is more than 5 minutes past `iat`. */
const LIFETIME_SECONDS = 5 * 60;

/**
 * Build and HS256-sign a fresh Ghost Admin API JWT. Pure local computation —
 * safe to call from the network-less `sign` hook.
 */
export async function signAdminApiJwt(
  rawApiKey: string,
  nowSeconds: number = Math.floor(Date.now() / 1000),
): Promise<string> {
  const { id, secret } = parseAdminApiKey(rawApiKey);
  const key = await crypto.subtle.importKey(
    "raw",
    hexToBytes(secret) as unknown as BufferSource,
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );

  const header = { alg: "HS256", typ: "JWT", kid: id };
  const claim = { iat: nowSeconds, exp: nowSeconds + LIFETIME_SECONDS, aud: "/admin/" };

  const signingInput = `${base64Url(encoder.encode(JSON.stringify(header)))}.${
    base64Url(encoder.encode(JSON.stringify(claim)))
  }`;
  const signature = await crypto.subtle.sign("HMAC", key, encoder.encode(signingInput));
  return `${signingInput}.${base64Url(signature)}`;
}

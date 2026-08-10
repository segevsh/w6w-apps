import type { AuthDefinition } from "@w6w/types";

/**
 * Inlined base64url encoder — the app sandbox has `import: false`, so we
 * can't pull from jsr:@std/encoding at runtime. Same output as
 * @std/encoding's `encodeBase64Url`: url-safe, no `=` padding.
 */
function encodeBase64Url(bytes: Uint8Array): string {
  let s = "";
  for (const b of bytes) s += String.fromCharCode(b);
  return btoa(s).replaceAll("+", "-").replaceAll("/", "_").replace(/=+$/, "");
}

/**
 * Service Account (custom JWT-bearer flow) — the "internal / server-to-server"
 * path. The user pastes a service account's `client_email` and PEM
 * `private_key` (from a downloaded Google JSON key). Every request signs a
 * short-lived JWT assertion, exchanges it at Google's token endpoint for an
 * OAuth 2.0 access token, and forwards that as a Bearer.
 *
 * Slides-specific caveats — read these before choosing this method:
 *   - A service account is a Drive principal with no UI. A presentation it
 *     *creates* is owned by the service account and is not visible in any
 *     human's Drive; for anything an operator needs to open, create the deck as
 *     a user or hand ownership over afterwards via Drive.
 *   - A presentation it *reads or edits* must be explicitly shared with the
 *     service account's email, exactly like sharing with a person. Google's
 *     sharing UI will show it under "Shared with…".
 *   - Domain-wide delegation (the `subject` field below) is the way to act as a
 *     real user in a Workspace domain, and is usually what you actually want.
 *
 * Notes:
 *   - We do the JWT sign + token exchange inline in `sign`. A real
 *     implementation should cache the exchanged token in a runtime-provided
 *     store keyed by (credential id, scope) until `exp - 60s`; the sandbox
 *     doesn't offer one yet, so we re-mint on every request. See TODO below.
 *   - Web Crypto's RSASSA-PKCS1-v1_5 + SHA-256 is the RS256 algorithm Google
 *     accepts for `urn:ietf:params:oauth:grant-type:jwt-bearer`.
 */

const TOKEN_URL = "https://oauth2.googleapis.com/token";

/**
 * `presentations` is the one scope shared by all five Slides methods, so it is
 * the whole default. See `auth/oauth2.ts` for why no Drive or Sheets scope is
 * requested; the `scopes` field below is the supported way to add one.
 */
const DEFAULT_SCOPES = "https://www.googleapis.com/auth/presentations";

interface ServiceAccountCredential {
  email: string;
  privateKey: string;
  /** Optional space-separated OAuth scopes. Defaults to `presentations`. */
  scopes?: string;
  /** Optional subject to impersonate (Workspace domain-wide delegation). */
  subject?: string;
}

const serviceAccount: AuthDefinition = {
  key: "service-account",
  type: "custom",
  displayName: "Service Account (JWT)",
  description:
    "Server-to-server auth using a Google service account. Paste the service account's email and PEM private key (from a downloaded JSON key). Share the target presentation with the service account's email, or use domain-wide delegation to impersonate a real user.",
  connectionLabel: "{{email}}",
  fields: [
    {
      key: "email",
      label: "Service Account Email",
      type: "string",
      required: true,
      hint:
        "The `client_email` field from your Google JSON key (e.g. `my-sa@my-project.iam.gserviceaccount.com`).",
    },
    {
      key: "privateKey",
      label: "Private Key (PEM)",
      type: "secret",
      required: true,
      hint:
        "The `private_key` field from your Google JSON key — include the `-----BEGIN PRIVATE KEY-----` / `-----END PRIVATE KEY-----` lines.",
    },
    {
      key: "subject",
      label: "Impersonate Subject (optional)",
      type: "string",
      hint:
        "Only for domain-wide delegation. The user email whose identity the service account should assume — usually what you want, so created decks land in a real person's Drive.",
    },
  ],

  async sign({ request, credential }, ctx) {
    const cred = credential as ServiceAccountCredential;
    const accessToken = await exchangeForAccessToken(cred, ctx.fetch);
    request.headers["authorization"] = `Bearer ${accessToken}`;
    return request;
  },

  async test({ credential }, ctx) {
    const cred = credential as ServiceAccountCredential | undefined;
    if (!cred?.email || !cred?.privateKey) {
      return { ok: false, message: "credential missing `email` or `privateKey`" };
    }
    try {
      // The exchange itself is the probe: a signed assertion that Google trades
      // for an access token proves the key, the account and the scope grant in
      // one round trip. There is no user token to introspect here, and no
      // Slides endpoint reachable without a presentationId.
      await exchangeForAccessToken(cred, ctx.fetch);
      return { ok: true };
    } catch (err) {
      return { ok: false, message: err instanceof Error ? err.message : String(err) };
    }
  },
};

export default serviceAccount;

/**
 * Sign a JWT assertion and exchange it for an OAuth access token at
 * `oauth2.googleapis.com/token`.
 *
 * TODO(caching): once the runtime exposes a per-credential ephemeral store,
 * cache the resulting `access_token` until `expires_at - 60s` so we don't
 * re-sign a JWT on every outbound request.
 */
export async function exchangeForAccessToken(
  cred: ServiceAccountCredential,
  fetchImpl: typeof fetch,
): Promise<string> {
  const now = Math.floor(Date.now() / 1000);
  const header = { alg: "RS256", typ: "JWT" };
  const claims: Record<string, unknown> = {
    iss: cred.email,
    scope: cred.scopes ?? DEFAULT_SCOPES,
    aud: TOKEN_URL,
    iat: now,
    exp: now + 3600,
  };
  if (cred.subject) claims.sub = cred.subject;

  const encoder = new TextEncoder();
  const signingInput = `${encodeBase64Url(encoder.encode(JSON.stringify(header)))}.${
    encodeBase64Url(encoder.encode(JSON.stringify(claims)))
  }`;

  const key = await importPkcs8Key(cred.privateKey);
  const sigBuf = await crypto.subtle.sign(
    { name: "RSASSA-PKCS1-v1_5" },
    key,
    encoder.encode(signingInput),
  );
  const assertion = `${signingInput}.${encodeBase64Url(new Uint8Array(sigBuf))}`;

  const body = new URLSearchParams({
    grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer",
    assertion,
  });

  const res = await fetchImpl(TOKEN_URL, {
    method: "POST",
    headers: { "content-type": "application/x-www-form-urlencoded" },
    body: body.toString(),
  });
  if (!res.ok) {
    const detail = await res.text().catch(() => "");
    throw new Error(`Google token exchange failed: ${res.status} ${res.statusText} ${detail}`);
  }
  const json = await res.json() as { access_token?: string; error?: string };
  if (!json.access_token) {
    // A 200 that carries no `access_token` is a failure wearing a success
    // status — treat the body, not `res.ok`, as the verdict. The message
    // deliberately quotes only Google's error envelope; the assertion and the
    // key that signed it never appear in it.
    throw new Error(
      `Google token exchange returned no access_token: ${json.error ?? "unknown error"}`,
    );
  }
  return json.access_token;
}

/**
 * Import a PEM-encoded PKCS#8 RSA private key (the format Google's downloaded
 * JSON keys use for the `private_key` field) into a Web Crypto key usable for
 * RS256 signing.
 */
async function importPkcs8Key(pem: string): Promise<CryptoKey> {
  const cleaned = pem
    .replace(/-----BEGIN [A-Z ]+-----/g, "")
    .replace(/-----END [A-Z ]+-----/g, "")
    .replace(/\s+/g, "");
  if (!cleaned) throw new Error("privateKey is empty after stripping PEM markers");
  const der = Uint8Array.from(atob(cleaned), (c) => c.charCodeAt(0));
  return await crypto.subtle.importKey(
    "pkcs8",
    der,
    { name: "RSASSA-PKCS1-v1_5", hash: "SHA-256" },
    false,
    ["sign"],
  );
}

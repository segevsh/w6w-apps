import type { AuthDefinition } from "@w6w/types";
import { CLOUD_PLATFORM_SCOPE, probe } from "./_probe.ts";
import { LOCATIONS } from "../lib/regions.ts";

/**
 * Inlined base64url encoder — the app sandbox has `import: false`, so nothing
 * can be pulled from jsr at runtime. Url-safe, no `=` padding.
 */
function encodeBase64Url(bytes: Uint8Array): string {
  let s = "";
  for (const b of bytes) s += String.fromCharCode(b);
  return btoa(s).replaceAll("+", "-").replaceAll("/", "_").replace(/=+$/, "");
}

const TOKEN_URL = "https://oauth2.googleapis.com/token";

interface ServiceAccountCredential {
  email: string;
  privateKey: string;
  projectId?: string;
  location?: string;
}

/**
 * Service account (custom JWT-bearer flow) — the server-to-server path, and the
 * normal one for production Vertex AI. Each request signs a short-lived RS256
 * JWT assertion, trades it at Google's token endpoint for an access token with
 * the `cloud-platform` scope, and sends that as a Bearer. Same flow as this
 * pack's `google-sheets` service-account method.
 *
 * The token is re-minted on every request — the sandbox has no per-credential
 * cache yet. The service account needs a Vertex AI role such as
 * `roles/aiplatform.user` on the project.
 */
const serviceAccount: AuthDefinition = {
  key: "service-account",
  type: "custom",
  displayName: "Service Account (JWT)",
  description:
    "Server-to-server auth with a Google service account. Paste the `client_email` and PEM " +
    "`private_key` from a downloaded JSON key, and grant the account a Vertex AI role on the project.",
  connectionLabel: "{{email}} ({{projectId}})",
  fields: [
    {
      key: "email",
      label: "Service Account Email",
      type: "string",
      required: true,
      hint: "The `client_email` field of the JSON key.",
    },
    {
      key: "privateKey",
      label: "Private Key (PEM)",
      type: "secret",
      required: true,
      hint: "The `private_key` field of the JSON key, including the BEGIN/END PRIVATE KEY lines.",
    },
    {
      key: "projectId",
      label: "Project ID",
      type: "string",
      required: true,
      placeholder: "my-gcp-project",
      hint: "The Google Cloud project Vertex AI calls run in and are billed to.",
    },
    {
      key: "location",
      label: "Default location",
      type: "select",
      default: "us-central1",
      options: LOCATIONS.map((l) => ({ value: l, label: l })),
    },
  ],

  async sign({ request, credential }, ctx) {
    const accessToken = await exchangeForAccessToken(
      credential as ServiceAccountCredential,
      ctx.fetch,
    );
    request.headers["authorization"] = `Bearer ${accessToken}`;
    return request;
  },

  async test({ credential }, ctx) {
    const cred = credential as ServiceAccountCredential | undefined;
    if (!cred?.email || !cred?.privateKey) {
      return { ok: false, message: "credential missing `email` or `privateKey`" };
    }
    let accessToken: string;
    try {
      accessToken = await exchangeForAccessToken(cred, ctx.fetch);
    } catch (err) {
      return { ok: false, message: err instanceof Error ? err.message : String(err) };
    }
    return await probe(
      { accessToken, projectId: cred.projectId, location: cred.location },
      ctx.fetch,
    );
  },

  afterConnect({ credential }) {
    const { projectId, location } = credential as ServiceAccountCredential;
    return { projectId: projectId?.trim(), location: location?.trim() || "us-central1" };
  },
};

export default serviceAccount;

/** Sign a JWT assertion and exchange it for an access token at the token endpoint. */
export async function exchangeForAccessToken(
  cred: ServiceAccountCredential,
  fetchImpl: typeof fetch,
): Promise<string> {
  const now = Math.floor(Date.now() / 1000);
  const claims = {
    iss: cred.email,
    scope: CLOUD_PLATFORM_SCOPE,
    aud: TOKEN_URL,
    iat: now,
    exp: now + 3600,
  };
  const encoder = new TextEncoder();
  const signingInput = `${
    encodeBase64Url(encoder.encode(JSON.stringify({ alg: "RS256", typ: "JWT" })))
  }.${encodeBase64Url(encoder.encode(JSON.stringify(claims)))}`;
  const key = await importPkcs8Key(cred.privateKey);
  const sig = await crypto.subtle.sign(
    { name: "RSASSA-PKCS1-v1_5" },
    key,
    encoder.encode(signingInput),
  );
  const assertion = `${signingInput}.${encodeBase64Url(new Uint8Array(sig))}`;

  const res = await fetchImpl(TOKEN_URL, {
    method: "POST",
    headers: { "content-type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer",
      assertion,
    }).toString(),
  });
  const text = await res.text().catch(() => "");
  let json: { access_token?: string; error?: string; error_description?: string } = {};
  try {
    json = JSON.parse(text);
  } catch { /* leave empty */ }
  // The verdict is the token endpoint's own `error` code (invalid_grant, invalid_client …),
  // never the status alone. The assertion is not echoed back.
  if (!json.access_token) {
    throw new Error(
      `Google token exchange failed (${res.status})${json.error ? `: ${json.error}` : ""}${
        json.error_description ? ` — ${json.error_description}` : ""
      }`,
    );
  }
  return json.access_token;
}

/** Import a PEM PKCS#8 RSA private key (the format Google JSON keys use) for RS256 signing. */
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

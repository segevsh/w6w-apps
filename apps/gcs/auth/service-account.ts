import type { AuthDefinition } from "@w6w/types";
import { API_BASE, DEFAULT_SCOPE, describeError, TOKEN_URL } from "../lib/client.ts";
import { encodeBase64Url, importPrivateKey, signRs256 } from "../lib/crypto.ts";

/**
 * A Google service account, via the JWT-bearer grant.
 *
 * ## No browser, and no user
 *
 * The service account *is* the identity. A JWT assertion is signed with its
 * private key and exchanged at Google's token endpoint for a one-hour access
 * token — no consent screen, no refresh token, nothing that expires when a
 * person leaves. That is what makes it the right credential for a scheduled
 * workflow, and it is the only flow this app offers.
 *
 * ## Creating the key grants nothing
 *
 * This is the failure people hit ten minutes after setting it up. A brand-new
 * service account can authenticate and can see **no buckets at all**, because
 * IAM roles are granted separately — on the project, or on an individual
 * bucket. The 403 that results says "does not have storage.objects.list
 * access" and does not say "you never granted a role".
 *
 * ## The private key is kept, not just the token
 *
 * Two reasons. The token lasts an hour and `refresh` re-mints it from the key.
 * And **signed URLs are signed with the key directly** — `object-signed-url`
 * makes no network call and needs the key itself, not a token. A credential
 * holding only an access token could not do it.
 *
 * ## Where the values come from
 *
 * A downloaded JSON key has `client_email` and `private_key`. The second is a
 * PEM block whose newlines are `\n` escapes inside the JSON string, so a value
 * pasted through a form often arrives with literal backslash-n. Both forms are
 * accepted.
 */
interface ServiceAccountCredential {
  clientEmail: string;
  privateKey: string;
  accessToken?: string;
  expiresAt?: string;
}

async function mintToken(
  ctx: Parameters<NonNullable<AuthDefinition["refresh"]>>[1],
  creds: { clientEmail: string; privateKey: string },
): Promise<Record<string, unknown>> {
  const now = Math.floor(Date.now() / 1000);
  const header = { alg: "RS256", typ: "JWT" };
  const claims = {
    iss: creds.clientEmail,
    scope: DEFAULT_SCOPE,
    aud: TOKEN_URL,
    iat: now,
    exp: now + 3600,
  };

  const encoder = new TextEncoder();
  const signingInput = `${encodeBase64Url(encoder.encode(JSON.stringify(header)))}.${
    encodeBase64Url(encoder.encode(JSON.stringify(claims)))
  }`;
  const key = await importPrivateKey(creds.privateKey);
  const assertion = `${signingInput}.${encodeBase64Url(await signRs256(key, signingInput))}`;

  const res = await ctx.fetch(TOKEN_URL, {
    method: "POST",
    headers: { "content-type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer",
      assertion,
    }).toString(),
  });
  const body = await res.json().catch(() => ({})) as {
    access_token?: string;
    expires_in?: number;
    error?: string;
    error_description?: string;
  };
  if (!res.ok || !body.access_token) {
    throw new Error(
      `Google token exchange failed (${res.status}): ${
        body.error_description ?? body.error ?? "no access token returned"
      }`,
    );
  }
  return {
    ...creds,
    accessToken: body.access_token,
    // An hour, with a minute of headroom for clock skew.
    expiresAt: new Date(Date.now() + ((body.expires_in ?? 3600) - 60) * 1000).toISOString(),
  };
}

const serviceAccount: AuthDefinition = {
  key: "service-account",
  type: "custom",
  displayName: "Service Account",
  description:
    "A service account's email and PEM private key, from its downloaded JSON key. Creating the " +
    "key grants NOTHING — the account also needs an IAM role on the project or on each bucket, " +
    "which is the usual cause of a 403 right after setup.",
  connectionLabel: "{{clientEmail}}",
  fields: [
    {
      key: "clientEmail",
      label: "Service Account Email",
      type: "string",
      required: true,
      default: "",
      placeholder: "worker@my-project.iam.gserviceaccount.com",
      hint: "The `client_email` from the JSON key. Grant this address a role — Storage Object " +
        "Admin on a bucket is usually enough, and is narrower than a project role.",
    },
    {
      key: "privateKey",
      label: "Private Key (PEM)",
      type: "secret",
      required: true,
      hint: "The whole `private_key` value, BEGIN and END lines included. It is kept rather than " +
        "discarded after the first token, because signed URLs are signed with the key itself.",
    },
    {
      key: "projectId",
      label: "Default Project",
      type: "string",
      default: "",
      hint: "Optional. Listing buckets needs a project id; naming one here saves repeating it.",
    },
  ],

  /** Turns the key into a live token at connect time. */
  exchange({ fields }, ctx) {
    const { clientEmail, privateKey } = (fields ?? {}) as Record<string, string>;
    if (!clientEmail || !privateKey) {
      throw new Error("Service Account Email and Private Key are both required.");
    }
    return mintToken(ctx, { clientEmail, privateKey });
  },

  /** The key outlives the token, so refreshing is the same exchange again. */
  refresh({ credential }, ctx) {
    const { clientEmail, privateKey } = credential as ServiceAccountCredential;
    return mintToken(ctx, { clientEmail, privateKey });
  },

  sign({ request, credential }) {
    const { accessToken } = credential as ServiceAccountCredential;
    request.headers["authorization"] = `Bearer ${accessToken}`;
    return request;
  },

  /**
   * Two questions, because they fail differently: does the key mint a token,
   * and does the account this key belongs to have any access at all.
   */
  async test({ credential }, ctx) {
    const cred = credential as ServiceAccountCredential | undefined;
    if (!cred?.accessToken) {
      return { ok: false, message: "credential has no access token — reconnect" };
    }

    const projectId = String(
      (credential as Record<string, unknown>)?.projectId ?? "",
    ).trim();
    if (!projectId) {
      // Without a project there is nothing to list, so prove the token instead.
      return {
        ok: true,
        message: `token minted for ${cred.clientEmail ?? "the service account"} — no default ` +
          "project was given, so bucket access has not been checked",
      };
    }

    let res: Response;
    try {
      res = await ctx.fetch(`${API_BASE}/b?project=${encodeURIComponent(projectId)}&maxResults=1`, {
        headers: { authorization: `Bearer ${cred.accessToken}`, accept: "application/json" },
      });
    } catch (err) {
      return { ok: false, message: `could not reach Cloud Storage: ${String(err)}` };
    }
    const text = await res.text().catch(() => "");
    if (!res.ok) {
      return { ok: false, message: describeError(res.status, text) };
    }

    let body: { items?: unknown[] } | null = null;
    try {
      body = JSON.parse(text) as { items?: unknown[] };
    } catch {
      return { ok: false, message: "Cloud Storage did not return JSON" };
    }

    const count = (body?.items ?? []).length;
    return {
      ok: true,
      message: count
        ? `connected as ${cred.clientEmail} — buckets are visible in ${projectId}`
        : `connected as ${cred.clientEmail}, and no buckets are visible in ${projectId}. That is ` +
          "either an empty project or an account with no role on it — creating a key grants " +
          "nothing by itself",
    };
  },

  /** Record who this is, so a 403 later has a name attached to it. */
  afterConnect({ credential }) {
    const cred = credential as Record<string, unknown>;
    return {
      clientEmail: cred?.clientEmail,
      projectId: cred?.projectId || undefined,
    };
  },
};

export default serviceAccount;

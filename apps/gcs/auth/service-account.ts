import type { AuthDefinition, ConnectionBinding } from "@w6w/types";
import { API_BASE, DEFAULT_SCOPE } from "../lib/client.ts";

/**
 * What a signed-path hook is handed (R-14): no credential (it is `null`), the
 * connection's binding, and the credential's non-secret display fields. Every
 * member is optional, so a hook run without one degrades instead of throwing.
 */
interface SaHookInput {
  credential: unknown;
  binding?: ConnectionBinding;
  credentialDisplay?: Record<string, string>;
}

/** A trimmed string binding setting, or `undefined` when absent or blank. */
function setting(binding: ConnectionBinding | undefined, key: string): string | undefined {
  const v = binding?.settings?.[key];
  return v === undefined || v === null ? undefined : String(v).trim() || undefined;
}

/**
 * A Google service account (`serviceAccount`).
 *
 * ## No browser, and no user
 *
 * The service account *is* the identity. The user pastes the downloaded JSON
 * key into one credential field; the host validates it and mints a one-hour
 * access token — no consent screen, no refresh token, nothing that expires when
 * a person leaves. That is what makes it the right credential for a scheduled
 * workflow, and it is the only flow this app offers. This module only attaches
 * the derived token: it holds no key material and mints nothing.
 *
 * ## Creating the key grants nothing
 *
 * This is the failure people hit ten minutes after setting it up. A brand-new
 * service account can authenticate and can see **no buckets at all**, because
 * IAM roles are granted separately — on the project, or on an individual
 * bucket. The 403 that results says "does not have storage.objects.list
 * access" and does not say "you never granted a role".
 *
 * ## Signed URLs go through IAM
 *
 * The app never holds the private key, so `object-signed-url` does not sign
 * locally: it asks the IAM Credentials `signBlob` API to sign on the service
 * account's behalf (`signWithIam`, `lib/signing.ts`). That needs the account to
 * be able to sign as itself (`roles/iam.serviceAccountTokenCreator`).
 *
 * ## Where the values come from
 *
 * The account email is shown from the credential's display fields
 * (`client_email`). The optional default project is a connection setting.
 */
const serviceAccount: AuthDefinition = {
  key: "service-account",
  type: "serviceAccount",
  displayName: "Service Account",
  description:
    "A service account's downloaded JSON key. Creating the key grants NOTHING — the account " +
    "also needs an IAM role on the project or on each bucket, which is the usual cause of a " +
    "403 right after setup.",
  connectionLabel: "{{clientEmail}}",
  fields: [
    {
      key: "serviceAccountKey",
      label: "Service account key (JSON)",
      type: "json",
      secret: true,
      required: true,
      ui: "textarea",
      hint: "Paste the whole JSON key file downloaded from Google Cloud. Grant its account a " +
        "role — Storage Object Admin on a bucket is usually enough, and is narrower than a " +
        "project role.",
    },
  ],
  serviceAccount: {
    accepts: ["google-service-account.v1"],
    scopes: [DEFAULT_SCOPE],
    impersonation: "none",
    bindingFields: [
      {
        key: "projectId",
        label: "Default Project",
        type: "string",
        hint: "Optional. Listing buckets needs a project id; naming one here saves repeating it.",
      },
    ],
  },

  sign({ request, credential }) {
    const token = (credential as { accessToken?: unknown } | null | undefined)?.accessToken;
    if (typeof token !== "string" || token === "") {
      throw new Error("service-account: no derived access token was provided");
    }
    request.headers["authorization"] = `Bearer ${token}`;
    return request;
  },

  /**
   * Does the account this key belongs to have any access at all. Whether the
   * key mints a token is the host's question, answered before this runs (D-D4).
   * No message carries response-body text: only status codes and Google's
   * enumerated `reason` token.
   */
  async test(input, ctx) {
    // The runtime signs this request (D-A3); the hook never reads the credential.
    const { binding } = input as unknown as SaHookInput;
    const projectId = setting(binding, "projectId");
    if (projectId === undefined) {
      // Without a project there is nothing to list.
      return {
        ok: true,
        message: "no default project was given, so bucket access has not been checked",
      };
    }

    let res: Response;
    try {
      res = await ctx.fetch(`${API_BASE}/b?project=${encodeURIComponent(projectId)}&maxResults=1`, {
        headers: { accept: "application/json" },
      });
    } catch {
      return { ok: false, message: "could not reach Cloud Storage" };
    }
    const text = await res.text().catch(() => "");
    if (!res.ok) {
      const reason = /"reason"\s*:\s*"([A-Za-z_]+)"/.exec(text)?.[1];
      const hint = res.status === 403
        ? " — the account may have no IAM role on the project or its buckets"
        : "";
      return {
        ok: false,
        message: `Cloud Storage returned ${res.status}${reason ? ` ${reason}` : ""}${hint}`,
      };
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
        ? `buckets are visible in ${projectId}`
        : `no buckets are visible in ${projectId}. That is either an empty project or an ` +
          "account with no role on it — creating a key grants nothing by itself",
    };
  },

  /** Record who this is, so a 403 later has a name attached to it. */
  afterConnect(input) {
    const { binding, credentialDisplay } = input as unknown as SaHookInput;
    return {
      clientEmail: credentialDisplay?.client_email,
      projectId: setting(binding, "projectId"),
    };
  },
};

export default serviceAccount;

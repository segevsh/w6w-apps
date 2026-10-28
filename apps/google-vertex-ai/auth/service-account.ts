import type { AuthDefinition, ConnectionBinding } from "@w6w/types";
import { CLOUD_PLATFORM_SCOPE, probe } from "./_probe.ts";
import { LOCATIONS } from "../lib/regions.ts";

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
 * Service account (`serviceAccount`) — the server-to-server path, and the
 * normal one for production Vertex AI. The user pastes the downloaded service
 * account JSON key into one credential field; the host validates it, mints
 * short-lived Google access tokens with the `cloud-platform` scope, and hands
 * each signed request a derived token.
 *
 * This module only attaches that token and probes the API. It holds no key
 * material and mints nothing. The project and default location are connection
 * settings on the binding, not credential fields. The service account needs a
 * Vertex AI role such as `roles/aiplatform.user` on the project.
 */
const serviceAccount: AuthDefinition = {
  key: "service-account",
  type: "serviceAccount",
  displayName: "Service Account",
  description:
    "Server-to-server auth with a Google service account. Paste the downloaded JSON key, and " +
    "grant the account a Vertex AI role on the project. The host mints the access token.",
  connectionLabel: "{{clientEmail}} ({{projectId}})",
  fields: [
    {
      key: "serviceAccountKey",
      label: "Service account key (JSON)",
      type: "json",
      secret: true,
      required: true,
      ui: "textarea",
      hint: "Paste the whole JSON key file downloaded from Google Cloud for the service account.",
    },
  ],
  serviceAccount: {
    accepts: ["google-service-account.v1"],
    scopes: [CLOUD_PLATFORM_SCOPE],
    impersonation: "none",
    bindingFields: [
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
  },

  sign({ request, credential }) {
    const token = (credential as { accessToken?: unknown } | null | undefined)?.accessToken;
    if (typeof token !== "string" || token === "") {
      throw new Error("service-account: no derived access token was provided");
    }
    request.headers["authorization"] = `Bearer ${token}`;
    return request;
  },

  async test(input, ctx) {
    // The runtime signs this request (D-A3); the hook never reads the credential.
    const { binding } = input as unknown as SaHookInput;
    return await probe(
      {
        signed: true,
        projectId: setting(binding, "projectId"),
        location: setting(binding, "location"),
      },
      ctx.fetch,
    );
  },

  afterConnect(input) {
    const { binding, credentialDisplay } = input as unknown as SaHookInput;
    return {
      clientEmail: credentialDisplay?.client_email,
      projectId: setting(binding, "projectId"),
      location: setting(binding, "location") || "us-central1",
    };
  },
};

export default serviceAccount;

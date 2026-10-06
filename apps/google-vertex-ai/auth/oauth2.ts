import type { AuthDefinition } from "@w6w/types";
import { CLOUD_PLATFORM_SCOPE, probe } from "./_probe.ts";
import { LOCATIONS } from "../lib/regions.ts";

/**
 * OAuth 2.0 — the interactive "Sign in with Google" path to Vertex AI.
 *
 * **Scope.** `cloud-platform`. The discovery document lists two for this API,
 * `.../auth/aiplatform` and `.../auth/cloud-platform`, and only the latter is
 * accepted by every method this app calls (`batchPredictionJobs.*` lists
 * `cloud-platform` alone). What the token can actually *do* is still decided by
 * the signed-in principal's IAM roles on the project.
 *
 * `access_type=offline` + `prompt=consent` so Google reliably returns a refresh
 * token; without one the connection dies in an hour.
 */
const oauth2: AuthDefinition = {
  key: "oauth2",
  type: "oauth2",
  displayName: "OAuth (Sign in with Google)",
  description:
    "Public OAuth flow. Requires a Google Cloud project with the Vertex AI API enabled and " +
    "OAuth client credentials configured on this w6w installation. Calls run with the signed-in " +
    "user's IAM permissions.",
  connectionLabel: "{{projectId}} ({{location}})",
  fields: [
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
      hint: "Actions fall back to this region. Models and endpoints live in one region.",
    },
  ],
  oauth2: {
    authorizationUrl: "https://accounts.google.com/o/oauth2/v2/auth",
    tokenUrl: "https://oauth2.googleapis.com/token",
    refreshUrl: "https://oauth2.googleapis.com/token",
    revokeUrl: "https://oauth2.googleapis.com/revoke",
    scopes: [CLOUD_PLATFORM_SCOPE],
    extraAuthParams: { access_type: "offline", prompt: "consent" },
    pkce: true,
  },

  sign({ request, credential }) {
    const { accessToken } = credential as { accessToken: string };
    request.headers["authorization"] = `Bearer ${accessToken}`;
    return request;
  },

  test({ credential }, ctx) {
    return probe(
      credential as { accessToken?: string; projectId?: string; location?: string },
      ctx.fetch,
    );
  },

  /** Records the project and default location the actions build paths from. */
  afterConnect({ credential }) {
    const { projectId, location } = credential as { projectId?: string; location?: string };
    return { projectId: projectId?.trim(), location: location?.trim() || "us-central1" };
  },
};

export default oauth2;

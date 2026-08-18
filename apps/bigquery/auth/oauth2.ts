import type { AuthDefinition } from "@w6w/types";
import { API_URL } from "../lib/client.ts";

/**
 * Google spells its OAuth scopes as URL-shaped *identifiers*. `www.googleapis.com`
 * is the namespace those URNs live in — it is never fetched, and it is
 * deliberately absent from `w6w.network.allow`: this app's only API host is
 * `bigquery.googleapis.com`, and allowing the generic Google API host would
 * widen the sandbox to every Google service. Same convention as the
 * `google-ads` and `google-analytics` apps in this pack.
 */
const SCOPE_NAMESPACE = "www.googleapis.com/auth";
const scope = (name: string) => `https://${SCOPE_NAMESPACE}/${name}`;

/**
 * OAuth 2.0 — the interactive auth path for the BigQuery API.
 *
 * **Scopes.** The discovery document lists seven; this app requests one:
 * `bigquery`, which covers running queries, reading results and managing
 * datasets, tables and jobs. The others are deliberately not asked for —
 * `cloud-platform` grants every Google Cloud API, and the three
 * `devstorage.*` scopes exist for load and export jobs that move data through
 * Cloud Storage, which this app does not do.
 *
 * **A note on service accounts.** Most production BigQuery access is a service
 * account with a signed JWT, not a user OAuth flow. That needs RS256 signing of
 * an assertion, which is a different auth shape; this app ships the OAuth path
 * and says so rather than half-implementing the other.
 *
 * Google requires `access_type=offline` + `prompt=consent` on the authorize URL
 * to reliably hand back a refresh token; without one the connection dies in an
 * hour and scheduled runs stop.
 */
const oauth2: AuthDefinition = {
  key: "oauth2",
  type: "oauth2",
  displayName: "OAuth (Sign in with Google)",
  description:
    "Public OAuth flow. Requires a Google Cloud project with the BigQuery API enabled and " +
    "OAuth client credentials configured on this w6w installation.",
  connectionLabel: "{{projectId}}",
  fields: [
    {
      key: "projectId",
      label: "Project ID",
      type: "string",
      required: true,
      placeholder: "my-gcp-project",
      hint: "The Google Cloud project these actions run in — and the one that is billed for " +
        "the bytes a query scans.",
    },
    {
      key: "datasetId",
      label: "Default Dataset",
      type: "string",
      default: "",
      hint: "Optional. Actions that take a dataset fall back to this one.",
    },
  ],
  oauth2: {
    authorizationUrl: "https://accounts.google.com/o/oauth2/v2/auth",
    tokenUrl: "https://oauth2.googleapis.com/token",
    refreshUrl: "https://oauth2.googleapis.com/token",
    revokeUrl: "https://oauth2.googleapis.com/revoke",
    scopes: [scope("bigquery")],
    extraAuthParams: {
      access_type: "offline",
      prompt: "consent",
    },
    pkce: true,
  },

  sign({ request, credential }) {
    const { accessToken } = credential as { accessToken: string };
    request.headers["authorization"] = `Bearer ${accessToken}`;
    return request;
  },

  /**
   * `GET /projects/{id}/datasets?maxResults=1` proves two things at once: the
   * token is live, **and** it can actually see the project the Connection
   * names. `GET /projects` would pass for a token that cannot touch this
   * project at all, which is the failure most worth catching at connect time.
   */
  async test({ credential }, ctx) {
    const { accessToken, projectId } = credential as {
      accessToken?: string;
      projectId?: string;
    };
    if (!accessToken) return { ok: false, message: "credential missing accessToken" };
    if (!projectId) return { ok: false, message: "credential missing projectId" };

    const res = await ctx.fetch(
      `${API_URL}/projects/${encodeURIComponent(projectId)}/datasets?maxResults=1`,
      { headers: { authorization: `Bearer ${accessToken}`, accept: "application/json" } },
    );
    if (res.status === 401) return { ok: false, message: "Google rejected the token (401)" };
    if (res.status === 403) {
      return {
        ok: false,
        message: "the BigQuery API is not enabled for this project, or the token lacks access " +
          "to it (403)",
      };
    }
    if (res.status === 404) {
      return { ok: false, message: `no such project "${projectId}" (404)` };
    }
    if (!res.ok) return { ok: false, message: `BigQuery returned ${res.status}` };
    return { ok: true };
  },

  /** Records the project and default dataset the actions build paths from. */
  afterConnect({ credential }) {
    const { projectId, datasetId } = credential as { projectId?: string; datasetId?: string };
    return {
      projectId: projectId?.trim(),
      datasetId: datasetId?.trim() || undefined,
    };
  },
};

export default oauth2;

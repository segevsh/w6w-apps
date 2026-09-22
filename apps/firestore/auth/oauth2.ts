import type { AuthDefinition } from "@w6w/types";
import { API_URL, databaseName, describeGoogleError, parseGoogleError } from "../lib/client.ts";

/**
 * Google spells its OAuth scopes as URL-shaped *identifiers*. `www.googleapis.com`
 * is the namespace those URNs live in — it is never fetched, so it is
 * deliberately absent from `w6w.network.allow`, which lists only the hosts this
 * app actually calls. Same convention as the `bigquery`, `google-ads` and
 * `google-analytics` apps in this pack.
 */
const SCOPE_NAMESPACE = "www.googleapis.com/auth";
const scope = (name: string) => `https://${SCOPE_NAMESPACE}/${name}`;

/**
 * OAuth 2.0 — the "public integrator" path, the same Google flow this pack's
 * other Google apps use. Register an OAuth client in the Google Cloud Console,
 * store `client_id` + `client_secret` + `redirect_uri` on the w6w server, and
 * users connect through the browser.
 *
 * **Scope.** The Firestore discovery document lists exactly two for this API:
 * `https://www.googleapis.com/auth/datastore` and `.../cloud-platform`. This app
 * asks for `datastore` — the narrow one, purpose-built for Firestore, and
 * sufficient for every RPC in this app including `databases.get` (each method's
 * `scopes` in the discovery doc lists it). `cloud-platform` grants every Google
 * Cloud API and is deliberately not requested.
 *
 * **Connection fields.** Firestore has no "my project" shortcut: every path
 * begins `projects/{projectId}/databases/{databaseId}/…`, so the project — and
 * the database, which is `(default)` for nearly everyone — are collected here
 * once, as ordinary (non-secret) connection fields, and carried into the redacted
 * connection `display` that actions read. Each action can still override them.
 *
 * **No service account.** Most production Firestore access is a service account
 * with a signed JWT assertion, which is a different auth shape (RS256 signing of
 * a self-signed assertion). This app ships the OAuth path and says so rather
 * than half-implementing the other — see the README.
 *
 * Google needs `access_type=offline` + `prompt=consent` on the authorize URL to
 * reliably hand back a refresh token on every consent; without one the
 * connection dies within the hour and scheduled runs stop.
 */
const oauth2: AuthDefinition = {
  key: "oauth2",
  type: "oauth2",
  displayName: "OAuth (Sign in with Google)",
  description:
    "Public OAuth flow. Requires a Google Cloud project with the Cloud Firestore API enabled " +
    "and OAuth client credentials configured on this w6w installation.",
  connectionLabel: "{{projectId}} / {{databaseId}}",
  fields: [
    {
      key: "projectId",
      label: "Project ID",
      type: "string",
      required: true,
      placeholder: "my-gcp-project",
      hint: "The Google Cloud project whose Firestore database these actions read and write.",
    },
    {
      key: "databaseId",
      label: "Database ID",
      type: "string",
      default: "(default)",
      hint: "Optional. Leave as `(default)` unless the project uses a named database.",
    },
  ],
  oauth2: {
    authorizationUrl: "https://accounts.google.com/o/oauth2/v2/auth",
    tokenUrl: "https://oauth2.googleapis.com/token",
    refreshUrl: "https://oauth2.googleapis.com/token",
    revokeUrl: "https://oauth2.googleapis.com/revoke",
    scopes: [scope("datastore")],
    // Without both of these Google does not reliably return a refresh token.
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
   * `GET /v1/projects/{projectId}/databases/{databaseId}` — the `databases.get`
   * RPC.
   *
   * Why this probe:
   *   - it is the one read that proves the token, the project *and* the database
   *     id in the Connection are all real, in a single request;
   *   - it returns database metadata (type, concurrency mode, location) and
   *     **never** the credential;
   *   - it needs nothing a fresh project lacks — no collection has to exist.
   *
   * The verdict comes from the response **body**, never the status code alone:
   * a `403 PERMISSION_DENIED` is both "this token is bad" and "the Firestore API
   * is not enabled on this project", so the body's `error.status` and message
   * decide what is reported.
   */
  async test({ credential }, ctx) {
    const { accessToken, projectId, databaseId } = credential as {
      accessToken?: string;
      projectId?: string;
      databaseId?: string;
    };
    if (!accessToken) return { ok: false, message: "credential missing accessToken" };
    const project = String(projectId ?? "").trim();
    if (!project) return { ok: false, message: "credential missing projectId" };
    const database = String(databaseId ?? "").trim() || "(default)";

    const res = await ctx.fetch(`${API_URL}/${databaseName(project, database)}`, {
      headers: { authorization: `Bearer ${accessToken}`, accept: "application/json" },
    });
    const text = await res.text();

    if (!res.ok) {
      const err = parseGoogleError(text);
      const detail = err?.message ? `: ${err.message}` : "";
      switch (err?.status) {
        case "UNAUTHENTICATED":
          return { ok: false, message: `Google rejected the token (UNAUTHENTICATED)${detail}` };
        case "PERMISSION_DENIED":
          return {
            ok: false,
            message: "Google denied access (PERMISSION_DENIED) — the token may be missing the " +
              `datastore scope, or the Firestore API may not be enabled on this project${detail}`,
          };
        case "NOT_FOUND":
          return {
            ok: false,
            message: `no such database "${project}/${database}" (NOT_FOUND)${detail}`,
          };
        default:
          return { ok: false, message: describeGoogleError(res.status, res.statusText, text) };
      }
    }

    // A 200 is not on its own proof this endpoint is `databases.get`: check the
    // body is the documented `Database` resource before believing it.
    let body: { name?: unknown } | undefined;
    try {
      body = JSON.parse(text) as { name?: unknown };
    } catch {
      return { ok: false, message: "Firestore answered 200 with a body that is not JSON" };
    }
    if (!body || typeof body.name !== "string") {
      return { ok: false, message: "Firestore answered 200 without a `Database` resource body" };
    }
    return { ok: true };
  },

  /**
   * Records the project and database on the connection, and — when Google
   * answers — the database's edition and concurrency mode as metadata, using the
   * same `databases.get` call.
   */
  async afterConnect({ credential }, ctx) {
    const project = String((credential as { projectId?: string })?.projectId ?? "").trim();
    const database = String((credential as { databaseId?: string })?.databaseId ?? "").trim() ||
      "(default)";
    const display: Record<string, unknown> = {
      projectId: project || undefined,
      databaseId: database,
    };
    if (!project) return display;

    // Best-effort: a metadata fetch that fails must not fail the connection.
    const res = await ctx.fetch(`${API_URL}/${databaseName(project, database)}`, {
      headers: { accept: "application/json" },
    });
    if (!res.ok) return display;
    const info = await res.json().catch(() => null) as {
      name?: string;
      type?: string;
      concurrencyMode?: string;
      locationId?: string;
    } | null;
    if (!info) return display;
    return {
      ...display,
      name: info.name,
      type: info.type,
      concurrencyMode: info.concurrencyMode,
      locationId: info.locationId,
    };
  },
};

export default oauth2;

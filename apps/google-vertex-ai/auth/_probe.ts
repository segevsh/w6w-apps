import { hostFor } from "../lib/regions.ts";
import { API_VERSION, parentOf, parseGoogleError } from "../lib/client.ts";

/**
 * Google spells its OAuth scopes as URL-shaped *identifiers*. `www.googleapis.com`
 * is the namespace those URNs live in — it is never fetched, and it is
 * deliberately absent from `w6w.network.allow`.
 */
const SCOPE_NAMESPACE = "www.googleapis.com/auth";
export const CLOUD_PLATFORM_SCOPE = `https://${SCOPE_NAMESPACE}/cloud-platform`;

export interface ProbeCredential {
  accessToken?: string;
  projectId?: string;
  location?: string;
}

/**
 * Prove a token is live AND can see the connection's project: list one endpoint
 * (`GET /v1/projects/{p}/locations/{l}/endpoints?pageSize=1`, discovery
 * `projects.locations.endpoints.list`). A listing of an empty project is a plain
 * 200 with `{}`, so nothing in a passing response is credential material.
 *
 * The verdict comes from Google's own `error.status` / `ErrorInfo.reason`, not
 * the HTTP status: 403 alone cannot tell "the Vertex AI API is not enabled" from
 * "this principal lacks an IAM role", and those are two different fixes.
 */
export async function probe(
  cred: ProbeCredential,
  fetchImpl: typeof fetch,
): Promise<{ ok: boolean; message?: string }> {
  if (!cred.accessToken) return { ok: false, message: "credential missing accessToken" };
  if (!cred.projectId) return { ok: false, message: "credential missing projectId" };
  const location = cred.location || "us-central1";
  const url = `https://${hostFor(location)}/${API_VERSION}/${
    parentOf(encodeURIComponent(cred.projectId), location)
  }/endpoints?pageSize=1`;

  const res = await fetchImpl(url, {
    headers: { authorization: `Bearer ${cred.accessToken}`, accept: "application/json" },
  });
  if (res.ok) return { ok: true };

  const text = await res.text().catch(() => "");
  const err = parseGoogleError(text);
  const reason = /"reason"\s*:\s*"([A-Z_]+)"/.exec(text)?.[1];
  switch (err.status) {
    case "UNAUTHENTICATED":
      return { ok: false, message: "Google rejected the credential (UNAUTHENTICATED)" };
    case "PERMISSION_DENIED":
      return {
        ok: false,
        message: reason === "SERVICE_DISABLED"
          ? `the Vertex AI API (aiplatform.googleapis.com) is not enabled for project "${cred.projectId}"`
          : `the credential is valid but may not list endpoints in "${cred.projectId}" — grant ` +
            "it a Vertex AI role such as roles/aiplatform.user (PERMISSION_DENIED)",
      };
    case "NOT_FOUND":
      return { ok: false, message: `no such project "${cred.projectId}" (NOT_FOUND)` };
    case "INVALID_ARGUMENT":
      return {
        ok: false,
        message: `Google rejected the request: ${err.message ?? "invalid argument"}`,
      };
  }
  return {
    ok: false,
    message: `Vertex AI returned ${res.status}${err.status ? ` ${err.status}` : ""}`,
  };
}

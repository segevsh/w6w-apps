import type { AuthDefinition } from "@w6w/types";
import { ACCEPT, API_BASE, errorMessage } from "../lib/client.ts";

/**
 * Tidio OpenAPI credentials: a Client ID (`ci_...`) and a Client Secret (`cs_...`), sent as two
 * headers on every request (`developers.tidio.com/docs/openapi-authorization.md`). Generated in
 * Tidio Panel > Developer > OpenAPI by a project owner or admin.
 *
 * ## The probe
 *
 * `GET /project` answers `{project_id, status}`: the project's own id and online/offline state.
 * It carries neither the Client ID nor the Secret, needs no extra scope, and is the cheapest read
 * in the reference. Measured 2026-10-06 (unsigned and with a bogus pair): both answer 401
 * `{"errors":[{"code":"unauthorized","message":"The authorization headers are missing"}]}` /
 * `...have invalid format`, while an unknown path answers 404, so a 401 here is the auth layer.
 *
 * The verdict comes from the body: a 200 must carry a numeric `project_id`; a rejection is the
 * vendor error code `unauthorized`; `api_access_disabled` (403) means the credential is fine but
 * the project's plan has no OpenAPI (it needs Plus or Premium).
 */
export const PROBE_PATH = "/project";

export interface TidioCredential {
  clientId: string;
  clientSecret: string;
}

export function authHeaders(credential: Partial<TidioCredential>): Record<string, string> {
  return {
    "x-tidio-openapi-client-id": (credential.clientId ?? "").trim(),
    "x-tidio-openapi-client-secret": (credential.clientSecret ?? "").trim(),
  };
}

const clientCredentials: AuthDefinition = {
  key: "client-credentials",
  type: "custom",
  displayName: "Client ID & Client Secret",
  description:
    "The OpenAPI key pair from Tidio Panel > Developer > OpenAPI (Plus or Premium plan). Both are " +
    "sent as headers on every request.",
  connectionLabel: "Tidio",
  fields: [
    {
      key: "clientId",
      label: "Client ID",
      type: "secret",
      required: true,
      hint: "Starts with ci_. Tidio Panel > Developer > OpenAPI > Generate API Key " +
        "(project owner or admin only).",
    },
    {
      key: "clientSecret",
      label: "Client Secret",
      type: "secret",
      required: true,
      hint: "Starts with cs_. Shown with the Client ID when the key is generated.",
    },
  ],

  sign({ request, credential }) {
    for (
      const [name, value] of Object.entries(authHeaders(credential as Partial<TidioCredential>))
    ) {
      request.headers[name] = value;
    }
    return request;
  },

  async test({ credential }, ctx) {
    const c = credential as Partial<TidioCredential> | undefined;
    if (!c?.clientId?.trim() || !c?.clientSecret?.trim()) {
      return { ok: false, message: "credential needs both clientId and clientSecret" };
    }
    const res = await ctx.fetch(`${API_BASE}${PROBE_PATH}`, {
      headers: { accept: ACCEPT, ...authHeaders(c) },
    });
    const body = await res.json().catch(() => null);
    if (res.ok) {
      if (typeof (body as { project_id?: unknown } | null)?.project_id === "number") {
        return { ok: true };
      }
      return { ok: false, message: "Tidio answered 200 without a project_id; unexpected response" };
    }
    const { code, message } = errorMessage(body);
    if (code === "unauthorized") {
      return {
        ok: false,
        message: "Tidio rejected the Client ID / Client Secret. Generate a key pair under " +
          "Developer > OpenAPI and reconnect.",
      };
    }
    if (code === "api_access_disabled") {
      return {
        ok: false,
        message: "Tidio OpenAPI access is disabled for this project (it needs the Plus or " +
          "Premium plan, and an owner or admin must enable it).",
      };
    }
    return {
      ok: false,
      message: `Tidio returned HTTP ${res.status} for ${PROBE_PATH}${
        message ? `: ${message}` : ""
      }`,
    };
  },
};

export default clientCredentials;

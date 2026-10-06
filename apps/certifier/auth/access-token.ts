import type { AuthDefinition } from "@w6w/types";
import { API_BASE, API_PREFIX, API_VERSION } from "../lib/client.ts";

/**
 * Certifier access token — `Authorization: Bearer <token>` plus the REQUIRED
 * `Certifier-Version` header. Verified 2026-10-06 against Certifier's OpenAPI
 * document (`developers.certifier.io/api/openapi.json`, `BearerAuth`) and live
 * probes of `api.certifier.io`.
 */

export interface CertifierCredential {
  accessToken: string;
}

/** The one place the wire format is built; `sign` and `test` share it. */
export function authHeaders(credential: Partial<CertifierCredential>): Record<string, string> {
  return {
    authorization: `Bearer ${credential.accessToken ?? ""}`,
    "certifier-version": API_VERSION,
  };
}

/**
 * The credential probe: `GET /v1/groups?limit=1`.
 *
 * It requires a credential (unsigned it answers 401), it reads workspace
 * template names rather than recipients' personal data (the credentials list
 * returns every recipient's name and email), and it returns no secret. The docs
 * mention `GET /v1/me` in the versioning page, but it is absent from the OpenAPI
 * document, so it is not used.
 */
export const PROBE_PATH = "/groups";

const accessToken: AuthDefinition = {
  key: "access-token",
  type: "bearer",
  displayName: "Access Token",
  description:
    "Paste an access token from Certifier > Settings > Developers > Access Tokens. A token " +
    "carries the whole workspace's privileges, so keep it to this connection.",
  connectionLabel: "Certifier",
  fields: [
    {
      key: "accessToken",
      label: "Access Token",
      type: "secret",
      required: true,
      hint: "Certifier > Settings > Developers > Generate Access Token. It is shown once.",
    },
  ],

  /** The only hook handed the raw credential; network-less. */
  sign({ request, credential }) {
    const cred = credential as Partial<CertifierCredential>;
    for (const [name, value] of Object.entries(authHeaders(cred))) {
      request.headers[name] = value;
    }
    return request;
  },

  async test({ credential }, ctx) {
    const cred = credential as Partial<CertifierCredential>;
    const token = (cred?.accessToken ?? "").trim();
    if (!token) return { ok: false, message: "credential missing accessToken" };

    const res = await ctx.fetch(`${API_BASE}${API_PREFIX}${PROBE_PATH}?limit=1`, {
      headers: { accept: "application/json", ...authHeaders({ accessToken: token }) },
    });
    // Classify from the body, never the status alone: success is the documented
    // `{ data: [...] }` page, and a rejection is the `{ error: { code } }` shape.
    const body = await res.json().catch(() => null) as
      | { data?: unknown; error?: { code?: string; message?: string } }
      | null;
    if (res.ok && body && Array.isArray(body.data)) return { ok: true };

    const code = body?.error?.code;
    if (res.status === 401 || code === "unauthorized") {
      return {
        ok: false,
        message: "Certifier rejected the access token (401 unauthorized). Check it was copied " +
          "exactly and has not been deleted in Settings > Developers.",
      };
    }
    if (res.status === 403 || code === "forbidden") {
      return { ok: false, message: "Certifier refused the token (403 forbidden)." };
    }
    if (res.status === 402 || code === "payment_required") {
      return {
        ok: false,
        message: "Certifier reports the workspace plan does not include API access (402).",
      };
    }
    if (res.status === 400 && (code === "missing_version" || code === "invalid_version")) {
      return { ok: false, message: `Certifier rejected the API version header (${code}).` };
    }
    return {
      ok: false,
      message: `Certifier returned HTTP ${res.status}${code ? ` ${code}` : ""} for ${PROBE_PATH}`,
    };
  },
};

export default accessToken;

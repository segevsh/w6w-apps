import type { AuthDefinition } from "@w6w/types";
import { API_BASE, API_PREFIX } from "../lib/client.ts";

/**
 * MaintainX API key — `Authorization: Bearer <key>` (a JWT).
 *
 * Verified against the OpenAPI document's `components.securitySchemes.Bearer`
 * (`type: http`, `scheme: bearer`, `bearerFormat: JWT`) on 2026-10-06. Keys are
 * generated per user in Settings > Integrations > API Keys, and API access is a
 * Premium / Enterprise plan feature.
 *
 * ## The probe is `GET /v1/organizations?limit=1`
 *
 * It needs the credential but no entity scope, and its response carries
 * organization names only — never the key. Measured live the same day, an
 * unauthenticated call answers `401 text/html` with the plain text
 * `Invalid authentication token` (the credential never reached the request),
 * while a malformed token answers `401 application/json`
 * `{"error":"Invalid token"}`. Those are two different diagnoses, so the hook
 * classifies from the BODY, not from the status line.
 */

export interface MaintainXCredential {
  apiKey: string;
}

export const PROBE_PATH = "/organizations";

export function authHeaders(credential: Partial<MaintainXCredential>): Record<string, string> {
  return { authorization: `Bearer ${credential.apiKey ?? ""}` };
}

interface OrganizationsBody {
  organizations?: Array<{ id?: number; name?: string }>;
  error?: string;
}

const apiKey: AuthDefinition = {
  key: "api-key",
  type: "bearer",
  displayName: "API Key",
  description:
    "Create an API key in MaintainX under Settings > Integrations > API Keys. API access needs a " +
    "Premium or Enterprise plan.",
  connectionLabel: "MaintainX ({{organization}})",
  fields: [
    {
      key: "apiKey",
      label: "API Key",
      type: "secret",
      required: true,
      hint: "MaintainX > Settings > Integrations > API Keys. The key acts as the user who " +
        "created it, so use a dedicated service-account user.",
    },
  ],

  /** The only hook handed the raw credential; network-less. */
  sign({ request, credential }) {
    for (
      const [name, value] of Object.entries(authHeaders(credential as Partial<MaintainXCredential>))
    ) {
      request.headers[name] = value;
    }
    return request;
  },

  async test({ credential }, ctx) {
    const key = ((credential as Partial<MaintainXCredential>)?.apiKey ?? "").trim();
    if (!key) return { ok: false, message: "credential missing apiKey" };

    const res = await ctx.fetch(`${API_BASE}${API_PREFIX}${PROBE_PATH}?limit=1`, {
      headers: { accept: "application/json", ...authHeaders({ apiKey: key }) },
    });
    const text = await res.text().catch(() => "");
    let body: OrganizationsBody | null = null;
    try {
      body = JSON.parse(text) as OrganizationsBody;
    } catch { /* plain-text refusal */ }

    if (res.ok && Array.isArray(body?.organizations)) return { ok: true };
    if (res.ok) {
      return {
        ok: false,
        message: "MaintainX answered 200 but not with an organizations list; the response is " +
          "not the documented shape.",
      };
    }
    if (!body && /invalid authentication token/i.test(text)) {
      return {
        ok: false,
        message: "MaintainX received no usable token. The credential did not reach the request " +
          "- reconnect this connection.",
      };
    }
    const detail = body?.error ?? text.slice(0, 200);
    if (res.status === 401) {
      return {
        ok: false,
        message:
          `MaintainX rejected the API key (401${detail ? ` ${detail}` : ""}). Check it was ` +
          "copied exactly and has not been revoked.",
      };
    }
    if (res.status === 403) {
      return {
        ok: false,
        message: `MaintainX refused the request (403${detail ? ` ${detail}` : ""})`,
      };
    }
    return { ok: false, message: `MaintainX returned HTTP ${res.status} for ${PROBE_PATH}` };
  },

  /** Label the connection with the organization name; silent on failure. */
  async afterConnect({ credential }, ctx) {
    try {
      const res = await ctx.fetch(`${API_BASE}${API_PREFIX}${PROBE_PATH}?limit=1`, {
        headers: {
          accept: "application/json",
          ...authHeaders(credential as Partial<MaintainXCredential>),
        },
      });
      if (!res.ok) return {};
      const body = await res.json() as OrganizationsBody;
      const org = body.organizations?.[0];
      return org?.name ? { organization: org.name } : {};
    } catch {
      return {};
    }
  },
};

export default apiKey;

import type { AuthDefinition } from "@w6w/types";
import { API_BASE, errorCode, readBody } from "../lib/client.ts";

/**
 * Anchor API key plus the acting user's email.
 *
 * https://docs.sayanchor.com/reference/authentication-1 — every request carries
 *
 *   Authorization:     Bearer anc-XXXXXX-XXXXXX
 *   Anchor-User-Email: <a registered Anchor user in the key's business>
 *
 * The SECOND header is the part that is easy to miss: a key alone is not a
 * credential. Anchor attributes every call to a named user, and 403 means "the
 * key is valid but that user may not do this". So the connection stores both,
 * and `sign` stamps both. The email is not secret, but it travels with the key
 * in one credential so a Connection can never hold one without the other.
 */
export interface AnchorCredential {
  apiKey: string;
  userEmail: string;
}

/** The one place the wire format is built; `sign` and `test` share it. */
export function authHeaders(credential: Partial<AnchorCredential>): Record<string, string> {
  return {
    authorization: `Bearer ${(credential.apiKey ?? "").trim()}`,
    "anchor-user-email": (credential.userEmail ?? "").trim(),
  };
}

/**
 * Credential probe: `GET /me` (`getActiveBusiness`). It needs both headers, is
 * not scope-dependent, and returns only `{businessId, businessName}` — nothing
 * that echoes the key.
 *
 * Classified from the BODY, never the status alone. Measured live 2026-10-06:
 *   no Authorization        -> 401 text/plain "Unauthorized"
 *   malformed bearer        -> 401 json {"error":"token contains an invalid number of segments"}
 *   well-formed unknown key -> 401 json {"error":"INVALID_API_KEY"}
 * Anchor documents 403 for a valid key whose user lacks permission.
 */
export const PROBE_PATH = "/me";

const apiKey: AuthDefinition = {
  key: "api-key",
  type: "custom",
  displayName: "API Key",
  description:
    "An Anchor API key and the email of the Anchor user the calls act as. Generate the key under " +
    "Integrations > API keys in the Anchor web app; the email must belong to a user in the same " +
    "business as the key.",
  connectionLabel: "Anchor ({{businessName}})",
  fields: [
    {
      key: "apiKey",
      label: "API Key",
      type: "secret",
      required: true,
      hint: "Starts with `anc-`. Treat it like a password; it grants your whole business account.",
    },
    {
      key: "userEmail",
      label: "Acting user email",
      type: "string",
      required: true,
      hint: "A registered Anchor user in the key's business. Anchor attributes every call, and " +
        "checks permissions, against this user.",
    },
  ],

  /** The only hook handed the raw credential; network-less. */
  sign({ request, credential }) {
    const cred = credential as Partial<AnchorCredential>;
    for (const [name, value] of Object.entries(authHeaders(cred))) {
      request.headers[name] = value;
    }
    return request;
  },

  async test({ credential }, ctx) {
    const cred = credential as Partial<AnchorCredential>;
    if (!(cred?.apiKey ?? "").trim()) return { ok: false, message: "credential missing apiKey" };
    if (!(cred?.userEmail ?? "").trim()) {
      return { ok: false, message: "credential missing userEmail" };
    }

    const res = await ctx.fetch(`${API_BASE}${PROBE_PATH}`, {
      headers: { accept: "application/json", ...authHeaders(cred) },
    });
    if (res.ok) return { ok: true };

    const code = errorCode(await readBody(res));
    const detail = `${res.status}${code ? ` ${code}` : ""}`;
    if (code === "INVALID_API_KEY") {
      return {
        ok: false,
        message: `Anchor rejected the API key (${detail}). Check it was copied exactly and has ` +
          "not been revoked under Integrations > API keys.",
      };
    }
    if (res.status === 401) {
      return {
        ok: false,
        message: `Anchor did not accept the credential (${detail}). Reconnect with a key that ` +
          "starts with anc-.",
      };
    }
    if (res.status === 403) {
      return {
        ok: false,
        message: `The key is valid but ${cred.userEmail} may not use it (${detail}). The email ` +
          "must be a registered Anchor user in the key's business.",
      };
    }
    return { ok: false, message: `Anchor returned HTTP ${detail} for ${PROBE_PATH}` };
  },

  /** Label the Connection with the business name. A failure here never fails a good key. */
  async afterConnect({ credential }, ctx) {
    try {
      const res = await ctx.fetch(`${API_BASE}${PROBE_PATH}`, {
        headers: { accept: "application/json", ...authHeaders(credential as AnchorCredential) },
      });
      if (!res.ok) return {};
      const body = await res.json() as { businessName?: string; businessId?: string };
      return body?.businessName
        ? { businessName: body.businessName, businessId: body.businessId ?? "" }
        : {};
    } catch {
      return {};
    }
  },
};

export default apiKey;

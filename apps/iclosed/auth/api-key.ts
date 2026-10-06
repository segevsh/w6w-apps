import type { AuthDefinition } from "@w6w/types";
import { API_URL } from "../lib/client.ts";

/**
 * iClosed API key — `Authorization: Bearer iclosed_<key>`.
 *
 * Verified 2026-10-06 against the authentication guide
 * (`developer.iclosed.io/docs/authentication`) and live probes of
 * `public.api.iclosed.io`. Keys are created at Settings → Developer → API Keys
 * and require a Business or Enterprise plan. A key is tied to a user and
 * account, may carry an expiry date, and is shown once.
 *
 * iClosed also documents an OAuth 2.1 (PKCE) flow, but it needs a client
 * registered with iClosed per integrator, so this app ships the API key only.
 */
export interface IClosedCredential {
  apiKey: string;
}

/** The prefix the wire requires. A key without it is answered as if absent. */
export const KEY_PREFIX = "iclosed_";

export function authHeaders(credential: Partial<IClosedCredential>): Record<string, string> {
  return { authorization: `Bearer ${(credential.apiKey ?? "").trim()}` };
}

/**
 * The credential-liveness probe: `GET /v1/fields/contact-stage`.
 *
 * It needs a key (unsigned it is a 401), takes no parameters, reads a single
 * CRM field definition and returns no credential material and no personal data
 * — unlike `GET /v1/users`, which lists the account's people with their
 * emails and phone numbers. It has not been exercised with a live key (none
 * was available); only its unsigned 401 was observed.
 */
export const PROBE_PATH = "/fields/contact-stage";

/**
 * Classify a rejection from the response BODY, not the status code. iClosed
 * answers 401 for all of these and distinguishes them only by `message`
 * (documented on the errors page and confirmed live for the first two).
 */
export function explain401(message: unknown): string {
  switch (message) {
    case "API key is required":
      return "iClosed treats the key as missing: it must be sent as `Bearer iclosed_<key>` — " +
        "the `iclosed_` prefix (underscore) is required. Copy the whole key from " +
        "Settings → Developer → API Keys.";
    case "API key expired":
      return "The iClosed API key has expired. Create a new one under Settings → Developer → API Keys.";
    case "Invalid API key":
      return "iClosed does not recognise this key (unknown, revoked or malformed). Create a new " +
        "one under Settings → Developer → API Keys.";
    default:
      return `iClosed rejected the key (401${typeof message === "string" ? `: ${message}` : ""}).`;
  }
}

const apiKey: AuthDefinition = {
  key: "api-key",
  type: "bearer",
  displayName: "API Key",
  description: "Paste an API key from iClosed → Settings → Developer → API Keys. API access " +
    "requires a Business or Enterprise plan.",
  connectionLabel: "iClosed",
  fields: [
    {
      key: "apiKey",
      label: "API Key",
      type: "secret",
      required: true,
      hint: "Starts with iclosed_. Shown only once when created. Use a key dedicated to this " +
        "connection; it acts as the user who created it.",
    },
  ],

  sign({ request, credential }) {
    for (
      const [name, value] of Object.entries(authHeaders(credential as Partial<IClosedCredential>))
    ) {
      request.headers[name] = value;
    }
    return request;
  },

  async test({ credential }, ctx) {
    const key = ((credential as Partial<IClosedCredential>)?.apiKey ?? "").trim();
    if (!key) return { ok: false, message: "credential missing apiKey" };
    if (!key.startsWith(KEY_PREFIX)) {
      return { ok: false, message: explain401("API key is required") };
    }

    const res = await ctx.fetch(`${API_URL}${PROBE_PATH}`, {
      headers: { accept: "application/json", ...authHeaders({ apiKey: key }) },
    });
    if (res.ok) return { ok: true };

    const body = await res.json().catch(() => null) as { message?: unknown } | null;
    if (res.status === 401) return { ok: false, message: explain401(body?.message) };
    if (res.status === 403) {
      return {
        ok: false,
        message: "iClosed refused the key (403). Check the account is on a Business or " +
          "Enterprise plan and the key may read fields.",
      };
    }
    if (res.status === 429) {
      return { ok: false, message: "iClosed rate-limited the connection test; retry shortly." };
    }
    return { ok: false, message: `iClosed returned HTTP ${res.status} for ${PROBE_PATH}` };
  },
};

export default apiKey;

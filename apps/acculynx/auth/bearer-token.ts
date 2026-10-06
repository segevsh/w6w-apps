import type { AuthDefinition } from "@w6w/types";
import { API_BASE, parseProblem } from "../lib/client.ts";

/**
 * AccuLynx API key — `Authorization: Bearer <API key>`.
 *
 * Verified 2026-10-06 against AccuLynx's API reference (OpenAPI `securitySchemes.bearerAuth`:
 * `type: http, scheme: bearer`) and a live unauthenticated probe of `api.acculynx.com`.
 *
 * ## Minting the key
 *
 * Keys are created in the AccuLynx web app (https://my.acculynx.com/apikeys). AccuLynx states that
 * "API keys are for our customers only": a company building an integration on a customer's behalf
 * must request access through AccuLynx's form first, and misuse can suspend the customer's
 * account. There is no sandbox; every call hits real production data.
 *
 * ## The probe is `GET /company-settings`
 *
 * `GET /diagnostics/ping` would be the obvious choice and is WRONG: it answers 200 to an
 * unauthenticated request (measured 2026-10-06), so it proves nothing about the key.
 * `/company-settings` needs a key, takes no parameters, and returns only the company id, name,
 * timezone and an insurance flag, so it never echoes the credential.
 *
 * ## Classification comes from the body, not the status
 *
 * A bad key answers a problem+json body whose `title` is "API Key is invalid or deactivated."
 * (the reference's 401 text: "The API key provided is missing, invalid, or has been
 * deactivated"). That title is what proves the key was rejected. A 429 is evaluated after
 * authentication, so it proves the key was accepted and is treated as a pass.
 */

export interface AccuLynxCredential {
  apiKey: string;
}

export const PROBE_PATH = "/company-settings";

/** The one place the wire format is built, so `sign` and `test` share it exactly. */
export function authHeaders(credential: Partial<AccuLynxCredential>): Record<string, string> {
  return { authorization: `Bearer ${credential.apiKey ?? ""}` };
}

const REJECTED_KEY = /api key.*(invalid|deactivated|missing)/i;

const bearerToken: AuthDefinition = {
  key: "bearer-token",
  type: "bearer",
  displayName: "API Key",
  description:
    "Paste an API key from the AccuLynx API Keys page (my.acculynx.com/apikeys). API keys are " +
    "issued to AccuLynx customers only, and there is no sandbox: calls affect real data.",
  connectionLabel: "AccuLynx",
  fields: [
    {
      key: "apiKey",
      label: "API Key",
      type: "secret",
      required: true,
      hint: "AccuLynx > API Keys (my.acculynx.com/apikeys).",
    },
  ],

  /** The only hook handed the raw credential; runs network-less. */
  sign({ request, credential }) {
    const cred = credential as Partial<AccuLynxCredential>;
    for (const [name, value] of Object.entries(authHeaders(cred))) {
      request.headers[name] = value;
    }
    return request;
  },

  async test({ credential }, ctx) {
    const cred = credential as Partial<AccuLynxCredential>;
    const apiKey = (cred?.apiKey ?? "").trim();
    if (!apiKey) return { ok: false, message: "credential missing apiKey" };

    const res = await ctx.fetch(`${API_BASE}${PROBE_PATH}`, {
      headers: { accept: "application/json", ...authHeaders({ apiKey }) },
    });
    if (res.ok) return { ok: true };

    const raw = await res.text().catch(() => "");
    const problem = parseProblem(raw);
    const title = problem?.title ?? "";

    if (REJECTED_KEY.test(title)) {
      return {
        ok: false,
        message: `AccuLynx rejected the API key (${title}). Check it was copied exactly and has ` +
          "not been deactivated on the API Keys page.",
      };
    }
    // Rate limiting runs after authentication: the key itself was accepted.
    if (res.status === 429) return { ok: true };
    if (res.status === 403) {
      return {
        ok: false,
        message: `AccuLynx refused the company-settings read${title ? ` (${title})` : ""}. ` +
          "The key may lack access to this company.",
      };
    }
    const detail = title || raw.trim().slice(0, 200);
    return {
      ok: false,
      message: `AccuLynx returned HTTP ${res.status} for ${PROBE_PATH}${
        detail ? `: ${detail}` : ""
      }`,
    };
  },
};

export default bearerToken;

import type { AuthDefinition } from "@w6w/types";
import { API_BASE, API_PREFIX } from "../lib/client.ts";

/**
 * HTML/CSS to Image uses HTTP Basic auth: the **API ID** is the username and the **API
 * Key** the password (`Authorization: Basic base64(api-id:api-key)`), per the OpenAPI
 * `securitySchemes.basic` and the docs.
 *
 * ## The probe is `GET /v1/usage`
 *
 * It needs a live credential, costs no image credit (the docs list `GET /v1/usage` among
 * the routes outside the management rate limits) and its body is image counts per
 * hour/day/month/billing period — no credential material. `POST /v1/image` is never used
 * as a probe: it spends credits.
 *
 * ## Classified from the body, not the status
 *
 * Measured 2026-10-06, unauthenticated: no header answers 401 `message: "Missing
 * Authorization"`; a wrong pair answers 401 `message: "API Key is Invalid"`. Both carry the
 * vendor's `{success:false, error, message, statusCode}` body. A **403** from an otherwise
 * valid key means the key lacks `usage:read` (keys can be scoped down to e.g. image-create
 * only); that is a *live* credential, so it passes — the permission the key lacks is not
 * the permission the actions it was scoped for need.
 */
export const PROBE_PATH = `${API_PREFIX}/usage`;

export interface HctiCredential {
  apiId: string;
  apiKey: string;
}

/** The one place the Basic header is built, shared by `sign` and `test`. */
export function authHeader(credential: Partial<HctiCredential>): string {
  return `Basic ${btoa(`${credential.apiId ?? ""}:${credential.apiKey ?? ""}`)}`;
}

interface ErrorBody {
  error?: string;
  message?: string;
  statusCode?: number | string;
}

const basic: AuthDefinition = {
  key: "basic",
  type: "basic",
  displayName: "API ID and API Key",
  description:
    "From the API keys page of your HTML/CSS to Image dashboard. Every new organization has a " +
    "default key; create a narrower one if the workflow only needs, say, image creation.",
  connectionLabel: "HTML/CSS to Image ({{apiId}})",
  fields: [
    {
      key: "apiId",
      label: "API ID",
      type: "string",
      required: true,
      hint: "The user ID shown beside the key in the dashboard.",
    },
    {
      key: "apiKey",
      label: "API Key",
      type: "secret",
      required: true,
      hint: "The secret key. Treat it like a password.",
    },
  ],

  sign({ request, credential }) {
    request.headers["authorization"] = authHeader(credential as Partial<HctiCredential>);
    return request;
  },

  async test({ credential }, ctx) {
    const cred = credential as Partial<HctiCredential>;
    const apiId = (cred?.apiId ?? "").trim();
    const apiKey = (cred?.apiKey ?? "").trim();
    if (!apiId || !apiKey) return { ok: false, message: "credential missing apiId or apiKey" };

    const res = await ctx.fetch(`${API_BASE}${PROBE_PATH}`, {
      headers: { accept: "application/json", authorization: authHeader({ apiId, apiKey }) },
    });
    const body = await res.json().catch(() => null) as ErrorBody | null;

    // Documented success shape: `{data: {...}, per_billing_period: [...]}`.
    if (res.ok) return { ok: true };

    if (res.status === 403) {
      // Authenticated, but the key is scoped away from usage:read (or the plan excludes it).
      return { ok: true };
    }
    if (res.status === 401) {
      return {
        ok: false,
        message: `HTML/CSS to Image rejected the credential: ${
          body?.message ?? "401 Unauthorized"
        }. Check the API ID and API Key from the dashboard's API keys page.`,
      };
    }
    return {
      ok: false,
      message: `HTML/CSS to Image returned HTTP ${res.status}${
        body?.message ? `: ${body.message}` : ""
      } for the usage probe.`,
    };
  },
};

export default basic;

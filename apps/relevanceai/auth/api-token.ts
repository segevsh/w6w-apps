import type { AuthDefinition } from "@w6w/types";
import { baseUrl, isAuthInfo } from "../lib/client.ts";

/**
 * Relevance AI API key — one opaque string, sent raw in `Authorization`.
 *
 * Verified on 2026-09-22 against the vendor's own live OpenAPI document, whose
 * security scheme is explicit:
 *
 *     "AuthorizationHeader": {
 *       "type": "apiKey", "in": "header", "name": "Authorization",
 *       "description": "Authorization credentials. Header authorization should
 *        be in the form of: project:api_key"
 *     }
 *
 * The key a user copies from Integrations & API Keys already contains the
 * `project_id:secret` shape baked into one string, so this app sends it
 * verbatim — no `Bearer` prefix, no splitting it on the colon. (Two other
 * narrative pages show `Authorization: Bearer :<api_key>` and
 * `Authorization: <project_id>:<api_key>` inconsistently; the OpenAPI security
 * scheme's own description wins over both.)
 *
 * ## The region id is a Connection field, not an Action param
 *
 * Relevance AI has no single API host: every organization is served from
 * `https://api-<region_id>.stack.tryrelevance.com`, and the region id is printed
 * on the same API Keys page as the key. It is collected here, beside the key,
 * because it identifies the ACCOUNT — the way Zendesk's `subdomain` does — and
 * `afterConnect` records it on the connection's redacted `display`, which is
 * where `lib/client.ts` reads it from. A workflow therefore cannot point at a
 * different region than the key belongs to.
 *
 * ## The probe is `GET /auth/info`, and it is classified from the BODY
 *
 * Probed live on 2026-09-22 against `api-f1db6c.stack.tryrelevance.com`:
 *
 *   | request                          | status | body                                                                  |
 *   | -------------------------------- | ------ | --------------------------------------------------------------------- |
 *   | no `Authorization` header        | **401**  | `{"message":"Authorization header cannot be missing or empty","error_type":"authorization_header_missing","error_audience":"user"}` |
 *   | a well-formed but wrong key      | **400**  | `{"message":"User key with id … not found in Postgres","error_type":"unset_error_type","error_audience":"platform"}` |
 *   | a live key                       | 200    | `GetAuthHeaderInfoOutput`                                             |
 *
 * A wrong key landing on **400** is the whole reason this hook never reads the
 * status code as a verdict: the success test is "does the body carry `user_id`
 * *and* `key_id`", and everything else is a failure described by its own
 * `error_type`. The response carries no credential field of any kind — the shape
 * is `user_id`, `key_id`, `email`, `first_name`, `last_name`, `company`, `role`
 * and a nested `permissions` map — which is what makes it safe both for this
 * probe and for `afterConnect`'s display data.
 */

export interface RelevanceAiCredential {
  regionId: string;
  apiKey: string;
}

/** The one place the wire format is built — `test` and `afterConnect` reuse it. */
export function authHeaders(credential: Partial<RelevanceAiCredential>): Record<string, string> {
  return { authorization: credential.apiKey ?? "" };
}

/** The credential-liveness probe. See the table above for why this path. */
export const PROBE_PATH = "/auth/info";

/**
 * The one `error_type` that means "no credential arrived" rather than "this
 * credential is wrong" — a distinction only the body can carry, since it is the
 * only failure the vendor puts on 401.
 */
export const MISSING_HEADER_ERROR_TYPE = "authorization_header_missing";

const apiToken: AuthDefinition = {
  key: "api-token",
  type: "apiKey",
  displayName: "API Key",
  description:
    "Paste the API key from Relevance AI → Integrations & API Keys, together with the region id " +
    "shown on that same page.",
  apiKey: { in: "header", name: "authorization" },
  connectionLabel: "{{user.name}} ({{regionId}})",
  fields: [
    {
      key: "regionId",
      label: "Region ID",
      type: "string",
      required: true,
      placeholder: "f1db6c",
      hint: "From Integrations & API Keys in Relevance AI — a short id like `f1db6c`, not a " +
        "URL. Your API host is `api-<region id>.stack.tryrelevance.com`.",
      validation: { pattern: "^[a-zA-Z0-9-]+$" },
    },
    {
      key: "apiKey",
      label: "API Key",
      type: "secret",
      required: true,
      hint: "Integrations & API Keys → Relevance API Keys. The key is one string in the form " +
        "`project_id:secret` — copy it whole.",
    },
  ],

  /**
   * The only hook handed the raw credential, and it runs network-less: it stamps
   * the header and returns. The key is never placed in a URL or a query string.
   */
  sign({ request, credential }) {
    const cred = credential as Partial<RelevanceAiCredential>;
    for (const [name, value] of Object.entries(authHeaders(cred))) {
      request.headers[name] = value;
    }
    return request;
  },

  /** See {@link PROBE_PATH} and the table in this file's header. */
  async test({ credential }, ctx) {
    const cred = credential as Partial<RelevanceAiCredential>;
    const regionId = (cred?.regionId ?? "").trim();
    const apiKey = (cred?.apiKey ?? "").trim();
    if (!regionId || !apiKey) {
      return { ok: false, message: "credential missing regionId or apiKey" };
    }

    let res: Response;
    try {
      res = await ctx.fetch(`${baseUrl(regionId)}${PROBE_PATH}`, {
        headers: { accept: "application/json", ...authHeaders({ apiKey }) },
      });
    } catch (error) {
      // A mistyped region id is the likeliest way to get here, and it is worth
      // naming, because the host is user-entered and nothing else in this app
      // can tell the user which of the two values to fix.
      return {
        ok: false,
        message:
          `could not reach ${baseUrl(regionId)}${PROBE_PATH}: ${String(error)}. Check the region ` +
          "id — it is the short id on the Integrations & API Keys page, not the whole hostname.",
      };
    }

    const body = await res.json().catch(() => null) as
      | Record<string, unknown>
      | null;

    // Success is read off the BODY. A correct key answers 200 with `user_id` and
    // `key_id`; nothing else does.
    if (isAuthInfo(body)) return { ok: true };

    if (body?.error_type === MISSING_HEADER_ERROR_TYPE) {
      return {
        ok: false,
        message:
          "Relevance AI received no Authorization header. The credential did not reach the " +
          "request — reconnect this connection.",
      };
    }
    if (!body) {
      return {
        ok: false,
        message: `Relevance AI returned HTTP ${res.status} for ${PROBE_PATH} with a body that ` +
          "was not JSON. A region id that does not belong to any organization answers with an " +
          "HTML error page, so check the region id first.",
      };
    }

    const type = typeof body.error_type === "string" ? ` ${body.error_type}` : "";
    const detail = typeof body.message === "string" ? `: ${body.message}` : "";
    return {
      ok: false,
      message:
        `Relevance AI rejected the key (HTTP ${res.status}${type})${detail}. Check the key was ` +
        "copied whole — it is `project_id:secret` as a single string — and that it has not been " +
        "rotated in Integrations & API Keys.",
    };
  },

  /**
   * Record the region id (and a display name) on the connection.
   *
   * The region id is written even when the probe fails: without it the client
   * cannot build a URL for this connection at all, and "the connection exists but
   * cannot be used" is a worse state than a label that fell back to the region.
   * `name` is `first_name last_name`, falling back to the email — the whoami
   * carries no single display-name field.
   */
  async afterConnect({ credential }, ctx) {
    const { regionId, apiKey } = credential as Partial<RelevanceAiCredential>;
    if (!regionId) return {};

    try {
      const res = await ctx.fetch(`${baseUrl(regionId)}${PROBE_PATH}`, {
        headers: { accept: "application/json", ...authHeaders({ apiKey }) },
      });
      if (!res.ok) return { regionId };
      const body = await res.json().catch(() => null) as
        | {
          user_id?: string;
          key_id?: string;
          email?: string;
          first_name?: string;
          last_name?: string;
          company?: string;
        }
        | null;
      if (!isAuthInfo(body)) return { regionId };

      const name = [body.first_name, body.last_name].filter(Boolean).join(" ") ||
        body.email || body.user_id;
      return {
        regionId,
        user: {
          id: body.user_id,
          keyId: body.key_id,
          email: body.email,
          name,
          company: body.company,
        },
      };
    } catch {
      return { regionId };
    }
  },
};

export default apiToken;

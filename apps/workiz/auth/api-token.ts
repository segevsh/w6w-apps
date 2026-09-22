import type { AuthDefinition } from "@w6w/types";
import { API_BASE, API_PREFIX, isForbiddenBody } from "../lib/client.ts";

/**
 * Workiz API token — spliced into the request **path**, not a header.
 *
 * Workiz's own OpenAPI document declares one server, `https://api.workiz.com`,
 * and its every example path reads
 * `https://api.workiz.com/api/v1/{api_token}/<endpoint-path>` — the token is a
 * path segment. The document defines **no** `Authorization` header, no bearer
 * scheme and no `?token=` parameter, so none is used here; a header-based
 * integration cannot work against this API at all.
 *
 * ## Why `type: "custom"` and not `"apiKey"`
 *
 * `@w6w/types`'s `apiKey` method requires an `ApiKeyConfig` whose `in` is one of
 * `header | query | body`. Workiz's token is in none of those places, so
 * declaring `apiKey` would mean writing config that lies about the wire. The
 * pack already takes `custom` for exactly this case (see `bitrix24`'s inbound
 * webhook, whose secret is likewise a path segment). `sign` is the only hook
 * that holds the credential, and it does the path splice.
 *
 * ## Two secrets, only one of them sign's job
 *
 * Workiz has a second secret in play — the **per-record** `auth_secret` that a
 * lead or job returns and that its update/assign/unassign/markLost/activate/
 * convert/addPayment calls require back. That one belongs to a single record,
 * not to the connection, so it is modelled as an ordinary Action input
 * (`lib/params.ts`'s `authSecretParam`) and `sign` never sees it. The account
 * API token is the only thing this method owns.
 */

export interface WorkizCredential {
  apiToken: string;
}

/**
 * The probe path. `GET /team/all/` is the endpoint every connection can reach
 * — it takes no parameters and no per-record secret — and its response is a
 * plain JSON array, which is the one shape that cannot be confused with the
 * Forbidden error body below.
 */
export const PROBE_PATH = "/team/all/";

/**
 * The one place the credential is turned into a wire path.
 *
 * Exported so `test` and `afterConnect` exercise the same code `sign` does — a
 * hand-rolled second copy is how a probe ends up sending something the real
 * requests do not.
 *
 *     https://api.workiz.com/team/all/  ->  https://api.workiz.com/api/v1/<token>/team/all/
 *
 * Throws on a missing token and on an already-signed URL rather than inventing
 * a path; either would otherwise produce a request Workiz answers with its
 * generic `Invalid API path or malformed API key.`
 */
export function signedUrl(url: string, token: string): string {
  const parsed = new URL(url);
  if (!token) throw new Error("workiz sign: the credential carries no API token");
  if (parsed.pathname.startsWith(`${API_PREFIX}/`)) {
    throw new Error(`workiz sign: refusing to sign an already-signed path (${parsed.pathname})`);
  }
  parsed.pathname = `${API_PREFIX}/${encodeURIComponent(token)}${parsed.pathname}`;
  return parsed.toString();
}

/**
 * Splice the token into a request's URL. Shared by `sign`, `test` and
 * `afterConnect` so all three go out identically.
 */
export function signRequest(
  request: { url: string; method: string; headers: Record<string, string> },
  credential: unknown,
): { url: string; method: string; headers: Record<string, string> } {
  const token = String((credential as Partial<WorkizCredential>)?.apiToken ?? "").trim();
  if (!token) throw new Error("workiz sign: the credential carries no API token");
  request.url = signedUrl(request.url, token);
  return request;
}

/** Read the credential's token without ever putting it in a message. */
function readToken(credential: unknown): string {
  return String((credential as Partial<WorkizCredential>)?.apiToken ?? "").trim();
}

const apiToken: AuthDefinition = {
  key: "api-token",
  type: "custom",
  displayName: "API Token",
  description:
    "An account API token from Workiz. It is embedded in the request path, which is the only " +
    "way this API accepts it — Workiz documents no authorization header.",
  connectionLabel: "Workiz ({{teamName}})",
  fields: [
    {
      key: "apiToken",
      label: "API Token",
      type: "secret",
      required: true,
      hint: "Paste the API token for the Workiz account this connection should act as. " +
        "Workiz's own API docs (developer.workiz.com) show where an account's token is " +
        "displayed. It is stored only as a connection credential and never sent in a header.",
    },
  ],

  /**
   * The only hook handed the raw credential at request time. Network-less: it
   * rewrites `request.url` and returns.
   */
  sign({ request, credential }) {
    return signRequest(request, credential);
  },

  /**
   * The credential-liveness probe — `GET /team/all/`, classified by response
   * **body**, never by status.
   *
   * Workiz's only documented refusal is a 403 whose body is
   * `{"success": false, "error": "Forbidden", "message": "Invalid API path or
   * malformed API key."}`. The vendor makes no distinction between a missing
   * token, a wrong token and a malformed path, so all three are reported as one
   * invalid-credential case — but a body that is *not* that shape and parses as
   * the expected array is a working token, regardless of what the status line
   * says. The token itself never reaches a message.
   */
  async test({ credential }, ctx) {
    const token = readToken(credential);
    if (!token) return { ok: false, message: "credential missing apiToken" };

    const request = signRequest(
      { method: "GET", url: `${API_BASE}${PROBE_PATH}`, headers: { accept: "application/json" } },
      credential,
    );
    const res = await ctx.fetch(request.url, { method: request.method, headers: request.headers });

    let body: unknown;
    const text = await res.text().catch(() => "");
    if (text) {
      try {
        body = JSON.parse(text);
      } catch {
        body = undefined;
      }
    }

    if (isForbiddenBody(body)) {
      return {
        ok: false,
        message: `Workiz rejected the API token: ${
          body.message || "Invalid API path or malformed API key."
        }`,
      };
    }
    if (!res.ok) {
      return { ok: false, message: `Workiz returned HTTP ${res.status} for ${PROBE_PATH}` };
    }
    if (!Array.isArray(body)) {
      return {
        ok: false,
        message: `Workiz answered ${PROBE_PATH} with an unexpected body — the token may be valid ` +
          `but the account is not returning team records.`,
      };
    }
    return { ok: true };
  },

  /**
   * Publish the first team member's name and role as the connection label.
   *
   * `GET /team/all/` is the same call the probe makes, and a list of connections
   * all reading "Workiz" is not usable; the team member's name says which
   * account and role the token acts as. Everything else on the member record —
   * email, id, service areas, skills — is dropped. A failure here is silent:
   * `test` already proved the token live, and a missing label must not fail a
   * good connection.
   */
  async afterConnect({ credential }, ctx) {
    const token = readToken(credential);
    if (!token) return {};
    try {
      const request = signRequest(
        { method: "GET", url: `${API_BASE}${PROBE_PATH}`, headers: { accept: "application/json" } },
        credential,
      );
      const res = await ctx.fetch(request.url, {
        method: request.method,
        headers: request.headers,
      });
      if (!res.ok) return {};
      const body = await res.json().catch(() => null) as
        | Array<{ name?: string; role?: string }>
        | null;
      const first = Array.isArray(body) ? body.find((m) => m && (m.name || m.role)) : undefined;
      if (!first) return {};
      const label: Record<string, string> = {};
      if (first.name) label.teamName = first.name;
      if (first.role) label.role = first.role;
      return label;
    } catch {
      return {};
    }
  },
};

export default apiToken;

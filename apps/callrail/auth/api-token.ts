import type { AuthDefinition } from "@w6w/types";
import { API_BASE, API_PREFIX } from "../lib/client.ts";

/**
 * CallRail API key — `Authorization: Token token=<api_key>`.
 *
 * Verified against CallRail's own reference (`apidocs.callrail.com`,
 * "Authorization" section) and live probes against `api.callrail.com` on
 * 2026-08-15.
 *
 * ## The header, in full
 *
 * The reference states the scheme in prose: `Authorization: Token
 * token="YOUR_API_KEY"`. Every one of its 69 curl examples renders it without
 * the inner quotes (`Authorization: Token token={api_token}`) — the quoted
 * form appears once, in a sentence, wrapping the *placeholder text* rather
 * than showing the literal wire value. A live probe confirms the unquoted
 * form is what the API expects: a request signed with a syntactically
 * plausible-but-wrong token gets exactly the same generic `401` as no token
 * at all (see {@link PROBE_PATH}), so getting the quoting wrong reads
 * identically to a bad key rather than announcing itself.
 *
 * ## Scoped to a user, not to one account
 *
 * "These API keys are scoped to individual users, and have access to the same
 * data as the user who created the key." A CallRail user — and therefore a
 * key — can belong to more than one account, which is why every action in
 * this app takes an explicit `accountId` param instead of assuming the
 * credential names exactly one (see `lib/params.ts`).
 *
 * ## Identifying a third-party integration
 *
 * The reference asks third-party integrations (not end users querying their
 * own data) to send `Request-From: <lowercased_name_with_underscores>`. This
 * app is generic infrastructure with no fixed product name to send, so it
 * does not set the header — an operator wiring this app up as part of a named
 * product may add it via a workflow-level default header if their host
 * supports one.
 */

export interface CallRailCredential {
  apiToken: string;
}

/**
 * The one place the wire format is built. Exported so `test` exercises the
 * same code path `sign` does.
 */
export function authHeaders(credential: Partial<CallRailCredential>): Record<string, string> {
  return { authorization: `Token token=${credential.apiToken ?? ""}` };
}

/**
 * The credential-liveness probe: `GET /v3/a.json` — Listing All Accounts.
 *
 * Chosen over the alternatives for the same reasons CallRail's own docs make
 * about scoped access:
 *
 * **(a) It requires a credential.** Verified live, unauthenticated: `401`
 * with `{"error":"HTTP Token: Access denied"}` (37 bytes, matches). A request
 * signed with a syntactically valid but wrong token gets the identical `401`
 * body — CallRail's API does not distinguish "missing" from "invalid" the way
 * some vendors do, so `test` can only report the credential rejected, not
 * *why*.
 *
 * **(b) It needs no account id and no company access.** Every other
 * meaningful read in this API is nested under `/a/{account_id}/...`, which
 * would force a probe to guess an account id (and could be legitimately
 * refused for a key scoped away from that account). `/v3/a.json` answers
 * "what can this key see at all", which is exactly what a liveness probe
 * needs and nothing more.
 *
 * **(c) It returns no credential material.** Its response is
 * `{"accounts": [{"id", "name", "outbound_recording_enabled",
 * "hipaa_account"}]}` — account labels, not secrets.
 */
export const PROBE_PATH = "/a.json";

const apiToken: AuthDefinition = {
  key: "api-token",
  type: "apiKey",
  displayName: "API Key",
  description: "Paste an API key from CallRail's account settings (Settings > API Access). " +
    "The key is scoped to the CallRail user who created it and can see every account that " +
    "user can access.",
  connectionLabel: "CallRail ({{accountCount}} account(s))",
  apiKey: { in: "header", name: "Authorization", prefix: "Token token=" },
  fields: [
    {
      key: "apiToken",
      label: "API Key",
      type: "secret",
      required: true,
      hint: "From the CallRail app: Settings > API Access. Treat it like a password — anyone " +
        "holding it can read or modify anything the creating user can.",
    },
  ],

  /**
   * The only hook handed the raw credential, and it runs network-less: it
   * stamps the header and returns. The key never appears in a URL — the
   * reference explicitly warns against the `?token=`-shaped alternative some
   * of its examples show for a different purpose (masking a key in a public
   * doc snippet), because "URLs are often stored in browser history and
   * server logs."
   */
  sign({ request, credential }) {
    const cred = credential as Partial<CallRailCredential>;
    for (const [name, value] of Object.entries(authHeaders(cred))) {
      request.headers[name] = value;
    }
    return request;
  },

  /** See {@link PROBE_PATH} for why this endpoint. */
  async test({ credential }, ctx) {
    const cred = credential as Partial<CallRailCredential>;
    const token = (cred?.apiToken ?? "").trim();
    if (!token) return { ok: false, message: "credential missing apiToken" };

    const res = await ctx.fetch(`${API_BASE}${API_PREFIX}${PROBE_PATH}`, {
      headers: { accept: "application/json", ...authHeaders({ apiToken: token }) },
    });
    if (res.ok) return { ok: true };

    if (res.status === 401) {
      return {
        ok: false,
        message: "CallRail rejected the API key (401). Check it was copied exactly from " +
          "Settings > API Access and has not been regenerated or removed.",
      };
    }
    const body = await res.json().catch(() => null) as { error?: unknown } | null;
    const detail = typeof body?.error === "string" ? body.error : undefined;
    return {
      ok: false,
      message: `CallRail returned HTTP ${res.status} for ${PROBE_PATH}${
        detail ? `: ${detail}` : ""
      }`,
    };
  },

  /**
   * Publish how many accounts this key can see, and nothing else.
   *
   * A single count rather than a full account list: the response could list
   * an arbitrary number of accounts (an agency key may see dozens), and a
   * Connection's label is meant to be scanned at a glance, not to duplicate
   * `account-list`. A failure here is deliberately silent — `test` has
   * already established the key is live, and a missing label must not fail a
   * good Connection.
   */
  async afterConnect({ credential }, ctx) {
    const cred = credential as Partial<CallRailCredential>;
    try {
      const res = await ctx.fetch(`${API_BASE}${API_PREFIX}/a.json`, {
        headers: { accept: "application/json", ...authHeaders(cred) },
      });
      if (!res.ok) return {};
      const body = await res.json() as { total_records?: number; accounts?: unknown[] };
      const accountCount = body?.total_records ?? body?.accounts?.length;
      return typeof accountCount === "number" ? { accountCount } : {};
    } catch {
      return {};
    }
  },
};

export default apiToken;

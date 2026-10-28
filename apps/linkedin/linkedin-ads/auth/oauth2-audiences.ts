import type { AuthDefinition } from "@w6w/types";
import { API_URL, API_VERSION, formatLinkedInAdsError } from "../lib/client.ts";

/**
 * OAuth 2.0 via LinkedIn's **Matched Audiences (Audiences program)** —
 * required for anything touching a DMP Segment: creating one, reading it,
 * updating it, or finding segments by account.
 *
 * A second auth method exists rather than one bigger scope list on
 * `auth/oauth2.ts` for the same reason the sibling `linkedin` app splits its
 * Community Management scopes out: LinkedIn's authorization endpoint rejects
 * the **entire** request if any requested scope isn't granted to the app
 * (`unauthorized_scope_error`), and the Matched Audiences docs are explicit
 * that `rw_dmp_segments` is separately gated — "This permission belongs to
 * the Audiences program and is not granted automatically as part of the
 * LinkedIn Marketing API Program" (`matched-audiences/create-and-manage-segments`,
 * read 2026-08-15). Bundling it into the base method would break connecting
 * for every Advertising-API-approved app that hasn't *also* been approved
 * for Audiences.
 *
 * `rw_ads` is requested here too: the account-scoped list-by-account finder
 * (`q=account`) and every DMP Segment's own `account` field reference a
 * Sponsored Account, and a connection using only this method still needs to
 * resolve one.
 */
const oauth2Audiences: AuthDefinition = {
  key: "oauth2-audiences",
  type: "oauth2",
  displayName: "OAuth (Matched Audiences)",
  description: "Create and manage DMP (Matched Audiences) segments. Requires a LinkedIn " +
    "Developer app approved for the Audiences program — separate from, and in addition to, the " +
    "Advertising API program the other auth method needs.",
  connectionLabel: "LinkedIn Ads — Matched Audiences",
  oauth2: {
    authorizationUrl: "https://www.linkedin.com/oauth/v2/authorization",
    tokenUrl: "https://www.linkedin.com/oauth/v2/accessToken",
    scopes: ["rw_ads", "rw_dmp_segments"],
    scopeSeparator: " ",
    pkce: false,
  },

  sign({ request, credential }) {
    const { accessToken } = credential as { accessToken: string };
    request.headers["authorization"] = `Bearer ${accessToken}`;
    return request;
  },

  /**
   * `GET /rest/dmpSegments?q=account&account=...` needs a real account URN,
   * which this hook doesn't have — searching with a syntactically valid but
   * non-existent account is still a legitimate liveness probe (a live token
   * gets back an empty `elements` array, not an error), and avoids depending
   * on the caller having created a segment yet. `urn:li:sponsoredAccount:0`
   * is not a valid account, so a `rw_dmp_segments`-scoped token still just
   * sees zero results rather than someone else's data.
   */
  async test({ credential }, ctx) {
    const { accessToken } = credential as { accessToken?: string };
    if (!accessToken) return { ok: false, message: "credential missing accessToken" };

    const res = await ctx.fetch(
      `${API_URL}/rest/dmpSegments?q=account&account=${
        encodeURIComponent("urn:li:sponsoredAccount:0")
      }`,
      {
        headers: {
          accept: "application/json",
          authorization: `Bearer ${accessToken}`,
          "x-restli-protocol-version": "2.0.0",
          "linkedin-version": API_VERSION,
        },
      },
    );
    if (res.ok) return { ok: true };

    const raw = await res.text().catch(() => "");
    if (res.status === 403) {
      return {
        ok: false,
        message: "LinkedIn returned 403 for the Matched Audiences API. This usually means the " +
          "connected Developer app hasn't been approved for the Audiences program yet — a valid " +
          `access token with rw_ads is not enough on its own. Detail: ${
            formatLinkedInAdsError(res.status, "GET", "/rest/dmpSegments", raw)
          }`,
      };
    }
    if (res.status === 401) {
      return {
        ok: false,
        message: `LinkedIn rejected the access token: ${
          formatLinkedInAdsError(res.status, "GET", "/rest/dmpSegments", raw)
        }`,
      };
    }
    return {
      ok: false,
      message: formatLinkedInAdsError(res.status, "GET", "/rest/dmpSegments", raw),
    };
  },
};

export default oauth2Audiences;

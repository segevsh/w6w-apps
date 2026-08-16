import type { AuthDefinition } from "@w6w/types";
import { API_BASE, API_PREFIX, formatTldvError } from "../lib/client.ts";

/**
 * tl;dv API key — `x-api-key: <key>`, a plain header, no prefix.
 *
 * Confirmed against the vendor's OpenAPI document
 * (`components.securitySchemes["Api Key Authentication"]`:
 * `{type: "apiKey", in: "header", name: "x-api-key"}`) and against the live API:
 * an unauthenticated `GET /v1alpha1/meetings` answers
 * `401 {"name":"AuthorizationRequiredError", ...}`.
 *
 * The key is generated per user at
 * `tldv.io/app/settings/personal-settings/api-keys` and is not scoped — the
 * docs describe only plan-based export limits (see below), never a
 * per-key permission set.
 *
 * ## API access is not the same thing as UI access
 *
 * The docs are explicit that this is a plan question, not a permission
 * question: seeing a meeting in the web app does not guarantee the API can
 * export it. **Programmatic access follows the plan of the meeting
 * ORGANIZER** (the calendar-invite organizer, or the meeting creator for an
 * ad-hoc call) — Free-plan organizers get zero API access to their meetings
 * even when shared with a Pro/Business/Enterprise teammate. So a live key can
 * legitimately return an empty `results` list for an account that can see
 * plenty of meetings in the UI; that is plan scope working as documented, not
 * a broken connection.
 */

/** The probe path. See {@link apiKey.test} for why this one and no others. */
export const PROBE_PATH = "/meetings";

interface MeetingsProbeBody {
  results?: unknown[];
}

const apiKey: AuthDefinition = {
  key: "api-key",
  type: "apiKey",
  displayName: "API Key",
  description:
    "Paste the API key from tldv.io/app/settings/personal-settings/api-keys. It acts as the " +
    "user who created it, subject to that user's plan (see the app README).",
  apiKey: { in: "header", name: "x-api-key" },
  fields: [
    {
      key: "apiKey",
      label: "API Key",
      type: "secret",
      required: true,
      hint: "tldv.io/app/settings/personal-settings/api-keys → Generate a new API Key. Requires " +
        "being logged in.",
    },
  ],

  /**
   * The ONLY hook handed the raw credential, and it runs network-less: it
   * stamps the header and returns, so the credential-holder cannot reach the
   * network and the network-caller never sees the credential.
   */
  sign({ request, credential }) {
    const { apiKey } = credential as { apiKey: string };
    request.headers["x-api-key"] = apiKey;
    return request;
  },

  /**
   * `GET /v1alpha1/meetings`, with NO query parameters.
   *
   * There is no dedicated ping endpoint that requires a credential (`/health`
   * answers `200` unauthenticated — see `health/api.ts`, it cannot tell a good
   * key from a bad one) and no whoami — tl;dv publishes no `/me` or `/user`
   * route at all. So this is the cheapest read the narrowest usable credential
   * can still perform, per the pack's own ordering of preference.
   *
   * Deliberately sent with NO query string. `GET /meetings?meetingType=bogus`
   * with a garbage key answers `400` (the query validation pipe runs before
   * the auth guard on that route) rather than the `401` a bad key normally
   * produces — measured live on 2026-08-16. Any query at all risks the same
   * ordering trap, so the probe sends none.
   */
  async test({ credential }, ctx) {
    const { apiKey } = credential as { apiKey?: string };
    if (!apiKey) return { ok: false, message: "credential missing apiKey" };

    const res = await ctx.fetch(`${API_BASE}${API_PREFIX}${PROBE_PATH}`, {
      headers: { "x-api-key": apiKey, accept: "application/json" },
    });
    if (res.ok) {
      const body = await res.json().catch(() => null) as MeetingsProbeBody | null;
      if (body && Array.isArray(body.results)) return { ok: true };
      return { ok: false, message: "tl;dv returned 200 with an unrecognised body" };
    }

    const text = await res.text().catch(() => "");
    // Missing and wrong keys answer the SAME body — see lib/client.ts — so
    // there is no sharper distinction to make here than the vendor's own.
    return { ok: false, message: formatTldvError(res.status, "GET", PROBE_PATH, text) };
  },
};

export default apiKey;

import type { AuthDefinition } from "@w6w/types";
import { API_URL, SCOPE_HEADER } from "../lib/client.ts";

/**
 * API Key (`apiKey`) — and why this, out of the several credentials Wix offers.
 *
 * Wix has three distinct ways to authenticate a REST call, and they are not
 * interchangeable:
 *
 *   1. **OAuth 2 app installs.** The credential is an *app instance* token,
 *      minted per site that installs a Wix app you have registered in the Wix
 *      Dev Center. It is the right choice for a product listed in the Wix App
 *      Market and installed by many sites. It is the wrong choice here: it
 *      requires a registered app, a redirect URI, a client secret, a review
 *      process, and an *install* on the target site before a single call can be
 *      made. A workflow host cannot ask a user to publish a Wix app in order to
 *      read their own CMS collection. Wix is explicit that API keys are not
 *      available to third-party Wix apps and OAuth is not available to API-key
 *      integrations — you pick a lane.
 *   2. **Wix API keys.** An account owner or co-owner mints a key in the API
 *      Keys Manager, scopes it to permissions and to specific sites, and pastes
 *      it. Wix documents this as the credential for exactly our situation:
 *      "external integrations — enable 3rd-party tools that call Wix APIs on
 *      your behalf" and "automated workflows". No app registration, no install,
 *      works in unattended background runs.
 *   3. The older Wix Apps / instance-token flow, which OAuth supersedes.
 *
 * **We ship (2).** It is the only one a workflow-automation host can realistically
 * ask a user to complete, and it is the one Wix itself points integrations at.
 * A second `AuthDefinition` of `type: "oauth2"` could be added later without
 * disturbing this one if the app is ever listed in the Wix App Market.
 *
 * ## The two headers, and why the credential carries both IDs
 *
 * A Wix call needs the key *and* an identity header. Wix's docs: "API calls
 * require either the `wix-account-id` header or the `wix-site-id` header, but
 * not both. Most APIs are site-level." So:
 *
 *   - Site-level calls (CMS, Contacts, Stores, eCommerce, Site Properties) send
 *     `wix-site-id`.
 *   - Account-level calls (Query Sites) send `wix-account-id`.
 *
 * Both IDs are collected at connect time so one Connection covers both, and
 * `sign` picks between them using the scope marker the client stamped. Neither
 * ID is a secret — a site ID is visible in the site's own dashboard URL — but
 * they live on the credential because `sign` is the only hook allowed to read a
 * Connection, and the header value has to come from somewhere per-connection.
 *
 * ## `Authorization` has no scheme prefix
 *
 * Wix takes the raw key: `Authorization: <API_KEY>`. Not `Bearer <API_KEY>`.
 * Every example in Wix's "Make API Calls with an API Key" page sends it bare,
 * and `apiKey.prefix` is set to `""` here to say so explicitly rather than by
 * omission.
 */
const apiKey: AuthDefinition = {
  key: "api-key",
  type: "apiKey",
  displayName: "API Key",
  description:
    "Paste an API key from the Wix API Keys Manager, plus the site and/or account ID it should act on. Sent as a bare `Authorization` header — Wix uses no `Bearer` prefix.",
  connectionLabel: "{{site.displayName}}",
  apiKey: {
    in: "header",
    name: "Authorization",
    prefix: "",
  },
  fields: [
    {
      key: "apiKey",
      label: "API Key",
      type: "secret",
      required: true,
      hint:
        "manage.wix.com → Account Settings → API Keys. Only an account owner or co-owner can create one. Grant it the permissions for the areas you will use (CMS, Contacts, Stores, eCommerce).",
    },
    {
      key: "siteId",
      label: "Site ID",
      type: "string",
      hint:
        "Required for site-level calls, which is almost everything here. Found after `/dashboard/` in the site's dashboard URL, or via the Query Sites action.",
    },
    {
      key: "accountId",
      label: "Account ID",
      type: "string",
      hint: "Required only for account-level calls (Query Sites). Shown in the API Keys Manager.",
    },
  ],

  /**
   * The only hook handed the raw credential, and it runs network-less.
   *
   * It stamps the key, resolves the scope marker into the correct identity
   * header, and removes the marker so it never reaches Wix. When the matching ID
   * is missing the header is simply omitted — Wix answers with a clear 403
   * naming the missing header, which is a better failure than this hook
   * inventing an empty one.
   */
  sign({ request, credential }) {
    const { apiKey: key, siteId, accountId } = credential as {
      apiKey: string;
      siteId?: string;
      accountId?: string;
    };

    request.headers["Authorization"] = key;

    // Header names arrive in whatever case the caller used; find the marker
    // case-insensitively so the client and this hook cannot drift apart.
    let scope = "site";
    for (const name of Object.keys(request.headers)) {
      if (name.toLowerCase() === SCOPE_HEADER) {
        scope = String(request.headers[name]).toLowerCase();
        delete request.headers[name];
      }
    }

    if (scope === "account") {
      if (accountId) request.headers["wix-account-id"] = accountId;
    } else if (siteId) {
      request.headers["wix-site-id"] = siteId;
    }

    return request;
  },

  /**
   * Validate the credential is live.
   *
   * The probe is chosen to match how the key is scoped, because a key restricted
   * to account-level work would fail a site-level probe and vice versa —
   * reporting a perfectly good credential as broken:
   *
   *   - With a site ID: `GET /site-properties/v4/properties`. This is the
   *     cheapest site-level "which site am I" read Wix offers; it returns the
   *     site's own properties and needs no product to be installed, so it works
   *     on a site with no Stores, no Bookings and an empty CMS.
   *   - With only an account ID: `POST /site-list/v2/sites/query` with an empty
   *     query, the account-level equivalent.
   */
  async test({ credential }, ctx) {
    const { apiKey: key, siteId, accountId } = credential as {
      apiKey?: string;
      siteId?: string;
      accountId?: string;
    };
    if (!key) return { ok: false, message: "credential missing apiKey" };
    if (!siteId && !accountId) {
      return { ok: false, message: "credential needs a siteId or an accountId" };
    }

    const res = siteId
      ? await ctx.fetch(`${API_URL}/site-properties/v4/properties`, {
        headers: { Authorization: key, "wix-site-id": siteId, accept: "application/json" },
      })
      : await ctx.fetch(`${API_URL}/site-list/v2/sites/query`, {
        method: "POST",
        headers: {
          Authorization: key,
          "wix-account-id": accountId!,
          accept: "application/json",
          "content-type": "application/json",
        },
        body: JSON.stringify({ query: {} }),
      });

    if (!res.ok) return { ok: false, message: `Wix returned ${res.status}` };
    return { ok: true };
  },

  /**
   * Label the Connection with the site's own name rather than an opaque GUID.
   *
   * Only meaningful for a site-scoped credential; an account-only key has no
   * single site to name, so it falls through to the default label.
   */
  async afterConnect({ credential }, ctx) {
    const { apiKey: key, siteId } = credential as { apiKey: string; siteId?: string };
    if (!siteId) return {};
    const res = await ctx.fetch(`${API_URL}/site-properties/v4/properties`, {
      headers: { Authorization: key, "wix-site-id": siteId, accept: "application/json" },
    });
    if (!res.ok) return {};
    const body = await res.json().catch(() => null) as {
      properties?: { siteDisplayName?: string; locale?: string; timeZone?: string };
    } | null;
    if (!body?.properties) return {};
    return {
      site: {
        id: siteId,
        displayName: body.properties.siteDisplayName,
        locale: body.properties.locale,
        timeZone: body.properties.timeZone,
      },
    };
  },
};

export default apiKey;

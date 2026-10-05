import type { AuthDefinition } from "@w6w/types";
import { API_BASE, API_PREFIX } from "../lib/client.ts";

/**
 * Gumroad access token — `Authorization: Bearer <token>`.
 *
 * ## What the reference says, and what it does not
 *
 * The reference says "On the application page, click **Generate access token**
 * to get the token you will use with the API", and its cURL examples pass it as
 * an `access_token` form/query parameter. The Custom HTML sections add "Authenticate
 * with a Bearer token". This app sends the **header** form and never the
 * parameter: a workflow host logs request URLs, not request headers. The
 * reference documents the header explicitly only on those sections; that the
 * remaining endpoints accept it too is inferred from Gumroad being a standard
 * OAuth 2 provider, not read from the page. `test` below exercises the header
 * on `/v2/user`, so a host that rejected it would fail at connect time.
 *
 * ## No OAuth2 method
 *
 * Gumroad is an OAuth 2 provider, but the reference never states the
 * authorization or token URL — it links out to a separate "Create an OAuth
 * application" guide. Not being able to confirm them, no `oauth2` method is
 * declared; the generated personal token is the baseline. Scopes the token needs
 * are per endpoint (`view_sales`, `edit_products`, `edit_sales`, `view_payouts`,
 * `view_tax_data`, `mark_sales_as_shipped`, or the catch-all `account`).
 *
 * ## The probe is `GET /v2/user`, and it does not echo the credential
 *
 * Its documented body is `bio, name, twitter_handle, user_id, email, url,
 * profile_picture_url` — profile data, no token, no secret (`email` appears only
 * with the `view_sales` scope). It needs only a read scope (`view_profile`), so
 * the narrowest usable token still reaches it.
 */

export interface GumroadCredential {
  accessToken: string;
}

/** The one place the wire format is built, shared by `sign`, `test` and `afterConnect`. */
export function authHeaders(credential: Partial<GumroadCredential>): Record<string, string> {
  return { authorization: `Bearer ${credential.accessToken ?? ""}` };
}

export const PROBE_PATH = "/user";

const accessToken: AuthDefinition = {
  key: "access-token",
  type: "bearer",
  displayName: "Access Token",
  description: "Generate an access token on your Gumroad application page (Settings > Advanced > " +
    "Applications). A token carries the scopes of its application — grant only what the " +
    "workflows using this connection need.",
  connectionLabel: "Gumroad ({{name}})",
  fields: [
    {
      key: "accessToken",
      label: "Access Token",
      type: "secret",
      required: true,
      hint: "Gumroad > Settings > Advanced > Applications > your application > Generate " +
        "access token.",
    },
  ],

  /** The only hook handed the raw credential; network-less. */
  sign({ request, credential }) {
    for (const [name, value] of Object.entries(authHeaders(credential as GumroadCredential))) {
      request.headers[name] = value;
    }
    return request;
  },

  /**
   * Classified from the body, not the status: Gumroad's own failure is
   * `{"success": false, "message": …}`, and a 200 carrying `success: false` is
   * still a rejection.
   */
  async test({ credential }, ctx) {
    const cred = credential as Partial<GumroadCredential>;
    const token = (cred?.accessToken ?? "").trim();
    if (!token) return { ok: false, message: "credential missing accessToken" };

    const res = await ctx.fetch(`${API_BASE}${API_PREFIX}${PROBE_PATH}`, {
      headers: { accept: "application/json", ...authHeaders({ accessToken: token }) },
    });
    const body = await res.json().catch(() => null) as
      | { success?: boolean; message?: string; user?: { user_id?: string } }
      | null;

    if (res.ok && body?.success === true) return { ok: true };
    if (body?.success === false) {
      return {
        ok: false,
        message: `Gumroad rejected the token (${res.status})${
          body.message ? `: ${body.message}` : ""
        }`,
      };
    }
    if (res.status === 401 || res.status === 403) {
      return {
        ok: false,
        message: `Gumroad rejected the token (${res.status}). Check it was copied exactly and ` +
          "that its application grants the view_profile or account scope.",
      };
    }
    return { ok: false, message: `Gumroad returned HTTP ${res.status} for ${PROBE_PATH}` };
  },

  /**
   * Publish the display name and user id, nothing else. `email` (present with
   * `view_sales`) and the rest of the profile never leave this function.
   * Silent on failure: `test` has already established the token is live.
   */
  async afterConnect({ credential }, ctx) {
    try {
      const res = await ctx.fetch(`${API_BASE}${API_PREFIX}${PROBE_PATH}`, {
        headers: {
          accept: "application/json",
          ...authHeaders(credential as Partial<GumroadCredential>),
        },
      });
      if (!res.ok) return {};
      const body = await res.json() as { user?: { name?: string; user_id?: string } };
      const name = body?.user?.name;
      const userId = body?.user?.user_id;
      if (!name) return {};
      return userId ? { name, userId } : { name };
    } catch {
      return {};
    }
  },
};

export default accessToken;

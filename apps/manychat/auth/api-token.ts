import type { AuthDefinition } from "@w6w/types";
import { API_URL, formatError, type ManychatErrorBody, type ManychatPage } from "../lib/client.ts";

/**
 * API token, sent as `Authorization: Bearer <token>`.
 *
 * ## Confirmed on the wire, not just in the spec
 *
 * The OpenAPI document declares exactly one security scheme and every operation
 * references it:
 *
 *     "securitySchemes": { "Bearer": { "type": "http", "name": "Authorization",
 *                                      "in": "header", "scheme": "bearer" } }
 *
 * And the API says so itself, checked 2026-08-03:
 *
 *     $ curl -sSi https://api.manychat.com/fb/page/getInfo
 *     HTTP/2 401
 *     {"status":"error","message":"Token is required"}
 *
 *     $ curl -sSi -H 'Authorization: Bearer 123456:deadbeef' \
 *         https://api.manychat.com/fb/page/getInfo
 *     HTTP/2 401
 *     {"status":"error","message":"Wrong token"}
 *
 * Two distinct messages for "no header" and "bad header" — so the header name and
 * the `Bearer` prefix are both right, and only the token value is wrong. That is
 * as much as can be verified without an account, and it is stated here rather
 * than implied.
 *
 * ## Token shape and scope
 *
 * The Swagger UI page sets the auth box's placeholder to
 * `Bearer 123456:n3g42k...` — a numeric prefix, a colon, then a secret. The
 * numeric half matches the Page id, and every Page API path is `/fb/page/...` or
 * `/fb/subscriber/...` with **no page or account identifier anywhere in the
 * request**: `getInfo` takes no parameters at all and still knows which Page to
 * describe. So the token *is* the page selector, and one Connection means one
 * Manychat Page/account. Connecting a second Page means a second Connection.
 *
 * The colon is not parsed here and no meaning is assumed beyond "opaque string":
 * the whole value is the credential and it is passed through verbatim.
 *
 * Manychat's help centre documents where to mint it (Settings → API). That page
 * sits behind Cloudflare's JS challenge and could not be read from this
 * environment on 2026-08-03, so the plan tier required to see the API settings
 * is deliberately **not** asserted anywhere in this app — see README.md
 * "What is not verified".
 *
 * ## One `secret` field, no `page id` field
 *
 * There is deliberately no separate Page-id field. Nothing in the API accepts
 * one, `getInfo` returns the id anyway, and offering a knob whose only correct
 * setting is a value the user cannot cross-check is a way to manufacture support
 * tickets.
 */
const apiToken: AuthDefinition = {
  key: "api-token",
  type: "bearer",
  displayName: "API Token",
  description: "The API token for one Manychat Page, from Manychat → Settings → API. Sent as " +
    "`Authorization: Bearer <token>`. One token = one Page.",
  connectionLabel: "{{pageName}}",
  fields: [
    {
      key: "token",
      label: "API Token",
      type: "secret",
      required: true,
      hint: "Looks like `123456:n3g42k…` — the numeric half is the Page id, the rest is secret. " +
        "Treat the whole string as the credential.",
    },
  ],

  sign({ request, credential }) {
    const { token } = credential as { token: string };
    request.headers["authorization"] = `Bearer ${token}`;
    return request;
  },

  /**
   * `GET /fb/page/getInfo` — the cheapest read the API has, and the only one
   * that needs no prior knowledge of anything in the account.
   *
   * Picked over the obvious alternatives on purpose:
   *
   *   - `/fb/page/getTags` and `/fb/page/getCustomFields` are equally cheap, but
   *     both return an empty array on a fresh Page. "Working" and "not set up
   *     yet" would read identically, and an empty list is a poor liveness proof.
   *   - `/fb/subscriber/getInfo` needs a `subscriber_id` this hook does not have.
   *   - `getInfo` also carries the highest documented rate limit in the whole API
   *     (100 queries per second, against 10 for most reads), so it is the one
   *     endpoint a host may poll without competing with the workflow's own
   *     traffic.
   */
  async test({ credential }, ctx) {
    const { token } = credential as { token?: string };
    if (!token) return { ok: false, message: "credential missing token" };

    const res = await ctx.fetch(`${API_URL}/fb/page/getInfo`, {
      headers: { accept: "application/json", authorization: `Bearer ${token}` },
    });
    const body = await res.json().catch(() => undefined) as ManychatErrorBody | undefined;

    // Both arms, for the same reason `lib/client.ts` has both: a 200 whose
    // envelope says `status: "error"` is not a working credential.
    if (!res.ok || body?.status === "error") {
      return { ok: false, message: `Manychat returned ${formatError(res.status, body)}` };
    }
    return { ok: true };
  },

  /**
   * Label the Connection with the Page it is bound to.
   *
   * `getInfo`'s `Page` schema is `{ id, name, category, avatar_link, username,
   * about, description, is_pro, timezone }` — public profile metadata only. It
   * contains **no credential material**, which is what makes it safe to lift onto
   * the Connection's `display`, where every action can read it. (Contrast
   * Mailjet, where the equivalent whoami returns the secret key in plaintext and
   * this pack refuses to call it at all.)
   *
   * `is_pro` and `timezone` are carried through because both change how the app
   * behaves for a human reading a run: `timezone` is the frame Manychat's
   * date-typed fields are interpreted in, and `is_pro` explains an entitlement
   * failure that would otherwise look like a bug.
   */
  async afterConnect({ credential }, ctx) {
    const { token } = credential as { token?: string };
    if (!token) return {};

    const res = await ctx.fetch(`${API_URL}/fb/page/getInfo`, {
      headers: { accept: "application/json", authorization: `Bearer ${token}` },
    });
    if (!res.ok) return {};
    const body = await res.json().catch(() => undefined) as
      | { status?: string; data?: ManychatPage }
      | undefined;
    if (body?.status === "error" || !body?.data) return {};

    const page = body.data;
    return {
      pageId: page.id === undefined ? undefined : String(page.id),
      pageName: page.name,
      pageUsername: page.username,
      timezone: page.timezone,
      isPro: page.is_pro,
    };
  },
};

export default apiToken;

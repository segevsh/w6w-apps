import type { AuthDefinition } from "@w6w/types";
import { API_URL, errorMessage } from "../lib/client.ts";

/**
 * Circle Admin API v2 token — one bearer header, one community.
 *
 * ## Which token, from where
 *
 * Circle's quick-start is unambiguous about the mint point and the type:
 *
 *   > Community admins can obtain an API key by going to the **Developers ->
 *   > Tokens** page in their community and selecting the type as **Admin V1 or
 *   > V2**.
 *
 * and about the wire format:
 *
 *   > ```json
 *   > { "Authorization": "Bearer <API_Token>", "Content-Type": "application/json" }
 *   > ```
 *
 * (<https://api.circle.so/apis/admin-api/quick-start>, fetched 2026-08-03.)
 *
 * ### The OpenAPI document says something different, and the docs win
 *
 * The v2 spec's `token_auth` security scheme describes the header as
 * `"Authorization header in the format \"Token AUTH_TOKEN\""`. That contradicts
 * every published example. Resolved on the wire against
 * `GET https://app.circle.so/api/admin/v2/community`, 2026-08-03:
 *
 *   | `Authorization`          | HTTP | Body                                        |
 *   | ------------------------ | ---- | ------------------------------------------- |
 *   | *(absent)*               | 401  | `{"success":false,"message":"API token not found."}` |
 *   | `bogus_token_zzz`        | 401  | `…"API token not found."`                    |
 *   | `Bearer bogus_token_zzz` | 401  | `…"The API token is invalid."`               |
 *   | `Token bogus_token_zzz`  | 401  | `…"The API token is invalid."`               |
 *
 * Two facts fall out. A **scheme word is required** — the bare token is not
 * seen at all, so the server splits on whitespace and reads the second field.
 * And both scheme words get *past* extraction into validation, so the server
 * does not care which word it is. `Bearer` is sent because that is what the
 * documentation and every example specify; the spec's `Token` wording is
 * treated as stale prose on a scheme whose only load-bearing part is the header
 * name.
 *
 * ## Scope: one token, one community
 *
 * The token is minted *inside a community* and Circle says plainly that it
 * carries that identity: "Your unique API token identifies your community
 * within Circle's server". There is no account-level or multi-community token,
 * which is why nothing in this App takes a community selector — one Connection
 * is one community, and running two communities means two Connections.
 *
 * ## Admin v1 exists. This App does not use it.
 *
 * Circle still serves a v1 Admin API at `app.circle.so/api/v1` and has not
 * deprecated it, but it recommends against it in its own words: "We **strongly
 * recommend** using the admin API v2 whenever possible, and updating your
 * codebase to v2 endpoints if you've built automations with the v1 API… new
 * endpoints and updates will only be added to our v2 API going forward"
 * (`/apis/admin-api`).
 *
 * There is a second, harder reason, found on the wire rather than in the docs.
 * **v1 answers HTTP 200 for an authentication failure.** On 2026-08-03,
 * `GET https://app.circle.so/api/v1/me` with no token, with a bare bogus token,
 * and with a bogus `Bearer` token all returned **200** with the body
 * `{"status":"unauthorized","message":"Your account could not be
 * authenticated."}`. v2 returns a real 401 for the same input. A client that
 * trusted the status line — which is what `res.ok` means — would treat every
 * v1 auth failure as a success and hand a workflow an error object shaped like
 * data. Supporting v1 would mean special-casing that in every action.
 *
 * The two token types are also not interchangeable ("Tokens are type-specific
 * … A wrong token type will also result in a 403"), so v1 could not be a
 * fallback for this credential even if the status codes were sane. If v1 is
 * ever wanted it belongs in a separate `AuthDefinition` with its own client,
 * not as a mode switch here.
 *
 * ## Plan gating is a first-class failure, not an outage
 *
 * The Admin API is "available to customers on the Business plan and above", and
 * v2 has its own eligibility flag. The spec's 403 example is
 * `{"success":false,"message":"The community is not eligible for admin API v2
 * access."}`. `test` reports that verbatim, because "upgrade your plan" and
 * "your token is wrong" need different fixes and a generic "auth failed" would
 * send an operator hunting for the wrong one.
 */

export interface CircleCredential {
  apiToken: string;
}

/**
 * The one place the wire format is built. Exported so `test`, `afterConnect`
 * and the unit tests exercise the same code path `sign` does — a hand-rolled
 * second copy is exactly how the scheme word goes missing on a probe, and the
 * table above shows that a missing scheme word fails silently as "not found".
 */
export function authHeaders(credential: Partial<CircleCredential>): Record<string, string> {
  return { Authorization: `Bearer ${credential.apiToken ?? ""}` };
}

const apiToken: AuthDefinition = {
  key: "api-token",
  type: "apiKey",
  displayName: "Admin API Token",
  description:
    "Mint an **Admin V2** token at Developers → Tokens inside your Circle community, then paste " +
    "it here. It is sent as `Authorization: Bearer <token>` and identifies exactly one " +
    "community. Requires the Business plan or above.",
  connectionLabel: "{{community.name}}",
  apiKey: {
    in: "header",
    name: "Authorization",
    prefix: "Bearer ",
  },
  fields: [
    {
      key: "apiToken",
      label: "Admin API Token",
      type: "secret",
      required: true,
      hint: "Developers → Tokens → New token, type **Admin V2**. An Admin V1 token will not " +
        "work here, and neither will a Headless token — Circle rejects a mismatched type " +
        "with a 403.",
    },
  ],

  /**
   * The only hook handed the raw token, and it runs network-less: it stamps the
   * header onto the outbound request and returns it.
   */
  sign({ request, credential }) {
    const cred = credential as Partial<CircleCredential>;
    for (const [name, value] of Object.entries(authHeaders(cred))) {
      request.headers[name] = value;
    }
    return request;
  },

  /**
   * `GET /community` is Circle v2's whoami.
   *
   * It is the right probe for three reasons:
   *
   *   - **It is what the token is for.** The token identifies a community; this
   *     endpoint returns that community. Nothing narrower exists — v2 has no
   *     `/me`, and the nearest alternatives are collections.
   *   - **It cannot be restricted away.** A listing probe (`/community_members`,
   *     `/spaces`) would report a working credential as broken the moment a
   *     community's own settings or plan withheld that collection, and it would
   *     pull a page of member PII across the wire just to prove a token works.
   *   - **It is cheap and read-only.** One request, no pagination, no writes.
   *     That matters more than usual here: Circle meters the Admin API monthly
   *     (5,000 requests on Business) and counts 4xx responses too, so a probe
   *     that fails still costs the customer.
   *
   * The three failures it distinguishes are the three that need different
   * fixes: 401 (token wrong, revoked, or the wrong type), 403 (token fine, the
   * community is not entitled to Admin API v2), anything else (Circle itself).
   */
  async test({ credential }, ctx) {
    const cred = credential as Partial<CircleCredential>;
    if (!cred?.apiToken) return { ok: false, message: "credential missing apiToken" };

    const res = await ctx.fetch(`${API_URL}/community`, {
      headers: { accept: "application/json", ...authHeaders(cred) },
    });

    if (res.status === 401) {
      const detail = errorMessage(await res.text().catch(() => ""));
      return {
        ok: false,
        message: `Circle rejected the token (401${detail ? `: ${detail}` : ""}). Check it is an ` +
          "Admin **V2** token — a V1 or Headless token is rejected the same way.",
      };
    }
    if (res.status === 403) {
      const detail = errorMessage(await res.text().catch(() => ""));
      return {
        ok: false,
        message: detail ||
          "Circle returned 403 — the community is not eligible for Admin API v2 access. The " +
            "Admin API needs the Business plan or above.",
      };
    }
    if (!res.ok) return { ok: false, message: `Circle returned HTTP ${res.status}` };
    return { ok: true };
  },

  /**
   * Labels the Connection with the community it belongs to.
   *
   * A Circle token is an opaque string with nothing readable in it, so unlike
   * the sibling `discourse` app there is no field to derive a label from — the
   * name has to be fetched. `GET /community` is the same call `test` makes, so
   * this adds no new endpoint and no new failure mode, and it returns `{}`
   * rather than throwing if anything goes wrong: a missing label must never
   * block a connection that authenticates.
   */
  async afterConnect({ credential }, ctx) {
    const cred = credential as Partial<CircleCredential>;
    if (!cred?.apiToken) return {};

    const res = await ctx.fetch(`${API_URL}/community`, {
      headers: { accept: "application/json", ...authHeaders(cred) },
    });
    if (!res.ok) return {};

    const body = await res.json().catch(() => null) as
      | { id?: number; name?: string; slug?: string }
      | null;
    if (!body?.name && !body?.id) return {};

    return { community: { id: body.id, name: body.name, slug: body.slug } };
  },
};

export default apiToken;

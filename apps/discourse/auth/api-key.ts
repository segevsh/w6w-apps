import type { AuthDefinition } from "@w6w/types";
import { normalizeSiteUrl } from "../lib/client.ts";

/**
 * Discourse API key — TWO headers, and neither of them is `Authorization`.
 *
 * ## The wire format, quoted from the vendor
 *
 * Discourse's own API reference (the `info.description` of the OpenAPI document
 * served at <https://docs.discourse.org/openapi.json>, fetched 2026-08-03) says:
 *
 *   > To become authenticated you will need to create an API Key from the admin
 *   > panel. Once you have your API Key you can pass it in along with your API
 *   > Username as an HTTP header like this:
 *   >
 *   >     curl -X GET ".../admin/users/list/active.json" \
 *   >       -H "Api-Key: 714552c6…" \
 *   >       -H "Api-Username: system"
 *
 * The server side matches exactly: `lib/auth/default_current_user_provider.rb`
 * reads `HTTP_API_KEY` and `HTTP_API_USERNAME` from the Rack env, i.e. the
 * `Api-Key` and `Api-Username` request headers.
 *
 * **Query-string and body authentication are gone.** Discourse dropped all
 * non-header authentication on 6 April 2020; the source still has an
 * `api_parameter_allowed?` path but it is off for ordinary requests. So the
 * headers are the only supported form, which is convenient — it means the
 * credential never has to be interpolated into a URL.
 *
 * ## Why `Api-Username` is a credential field and not an action param
 *
 * `Api-Username` is not a routing hint. It selects **who the request is made
 * as**, and the server's behaviour depends on which kind of key you hold
 * (`lookup_api_user`, same file):
 *
 *   - **Single User key** (`api_key.user` present) — the key is bound to one
 *     account. `Api-Username` is optional, but if sent it must equal that
 *     account's username, case-insensitively; anything else fails
 *     authentication outright rather than falling back.
 *   - **All Users / global key** (`api_key.user` nil) — `Api-Username` picks the
 *     acting user, and without it (or the `Api-User-Id` / `Api-User-External-Id`
 *     alternatives) there is no user at all and the request is rejected.
 *
 * Either way the username is half of "which principal is this", exactly like the
 * username in Basic auth. Putting it on an Action would let two actions on one
 * Connection disagree about who they are, put credential-adjacent material in
 * the network-capable action worker, and — for a Single User key — offer a knob
 * whose only correct setting is a value the workflow author cannot see.
 * `tests/index.test.ts` asserts no action declares it.
 *
 * It is a plain `string`, not a `secret`: a forum username is public
 * information, and masking it would make a typo impossible to spot. The key
 * beside it is masked.
 *
 * It is marked `required` even though a Single User key would work without it,
 * because the two failure modes are asymmetric: sending a correct username is
 * always fine, while omitting it on a global key produces a bare 403 that looks
 * like a bad key. The hint explains the Single User constraint.
 *
 * ## What this app deliberately does not implement
 *
 * Discourse has a **second, different** credential — the "User API key"
 * (`User-Api-Key` header, `PARAMETER_USER_API_KEY` in the same provider). It is
 * a per-user, scoped key minted through a browser handshake with an RSA public
 * key, designed so a mobile app can get access without an admin issuing
 * anything. It is a genuinely separate spec and a genuinely separate auth
 * method; it is not shipped here because it needs an interactive registration
 * flow that an unattended workflow cannot complete. Add it as a second
 * `AuthDefinition` if that flow is ever hosted.
 */

export interface DiscourseCredential {
  siteUrl: string;
  apiKey: string;
  apiUsername: string;
}

/**
 * The one place the wire format is built. Exported so `test` and the unit tests
 * exercise the same code path `sign` does — a hand-rolled second copy is exactly
 * how one of the two headers goes missing on a probe.
 */
export function authHeaders(credential: Partial<DiscourseCredential>): Record<string, string> {
  return {
    "Api-Key": credential.apiKey ?? "",
    "Api-Username": credential.apiUsername ?? "",
  };
}

const apiKey: AuthDefinition = {
  key: "api-key",
  type: "apiKey",
  displayName: "API Key",
  description:
    "Mint a key at Admin → API → Keys on your forum, then paste it here with the username it " +
    "acts as. Discourse authenticates on two headers: `Api-Key` and `Api-Username`.",
  connectionLabel: "{{user.username}} @ {{site.host}}",
  apiKey: {
    in: "header",
    name: "Api-Key",
    prefix: "",
  },
  fields: [
    {
      key: "siteUrl",
      label: "Forum URL",
      type: "string",
      required: true,
      placeholder: "https://forum.example.com",
      hint: "The root URL of your Discourse forum — self-hosted or Discourse-hosted. No trailing " +
        "path, and no `.json` suffix.",
    },
    {
      key: "apiKey",
      label: "API Key",
      type: "secret",
      required: true,
      hint: "Admin → API → Keys → New API Key. Scope it to the endpoints you need rather than " +
        "granting Global access.",
    },
    {
      key: "apiUsername",
      label: "API Username",
      type: "string",
      required: true,
      default: "system",
      placeholder: "system",
      hint: "The account requests are made as. For a Single User key this MUST be that key's own " +
        "user — any other name is rejected outright. For an All Users key it can be any " +
        "account; `system` is Discourse's built-in automation user.",
      validation: { pattern: "^[A-Za-z0-9._-]+$" },
    },
  ],

  /**
   * The only hook handed the raw credential, and it runs network-less: it stamps
   * both headers onto the outbound request and returns it.
   */
  sign({ request, credential }) {
    const cred = credential as Partial<DiscourseCredential>;
    for (const [name, value] of Object.entries(authHeaders(cred))) {
      request.headers[name] = value;
    }
    return request;
  },

  /**
   * `GET /session/current.json` is Discourse's whoami, but it is session-based
   * and does not answer for an API key. The narrowest probe that an API key
   * genuinely answers is the user record of the account the key acts as:
   * `GET /u/{apiUsername}.json`.
   *
   * That is the right liveness check because it is exactly the identity the
   * credential claims. It distinguishes the three failures that matter:
   *
   *   - 403 — the key is wrong, revoked, or (for a Single User key) paired with
   *     the wrong username. Discourse answers 403, not 401, for a rejected API
   *     key; treating only 401 as "bad credential" would misreport every one of
   *     them as an outage.
   *   - 404 — the key authenticated but the username does not exist on this
   *     forum, which is a typo in the username field rather than a bad key.
   *   - transport failure — the forum URL is wrong or the site is down, which is
   *     what the `site` health check reports on separately.
   *
   * Probing a content collection instead (`/latest.json`, `/categories.json`)
   * would report a working credential as broken whenever the key's scopes or the
   * user's trust level restrict category access — and a correctly-scoped key
   * routinely cannot read everything.
   */
  async test({ credential }, ctx) {
    const cred = credential as Partial<DiscourseCredential>;
    if (!cred?.siteUrl) return { ok: false, message: "credential missing siteUrl" };
    if (!cred?.apiKey) return { ok: false, message: "credential missing apiKey" };
    if (!cred?.apiUsername) {
      return {
        ok: false,
        message:
          "credential missing apiUsername — Discourse requires Api-Username alongside the key",
      };
    }

    let base: string;
    try {
      base = normalizeSiteUrl(cred.siteUrl);
    } catch (err) {
      return { ok: false, message: (err as Error).message };
    }

    const res = await ctx.fetch(
      `${base}/u/${encodeURIComponent(cred.apiUsername)}.json`,
      { headers: { accept: "application/json", ...authHeaders(cred) } },
    );
    if (res.status === 403 || res.status === 401) {
      return {
        ok: false,
        message: `Discourse rejected the credential (${res.status}). Check the key, and that the ` +
          "username matches the key's own user if it is a Single User key.",
      };
    }
    if (res.status === 404) {
      return {
        ok: false,
        message: `No such user on this forum: ${cred.apiUsername}`,
      };
    }
    if (!res.ok) return { ok: false, message: `Discourse returned HTTP ${res.status}` };
    return { ok: true };
  },

  /**
   * Records the forum origin and the acting username on the Connection so the
   * client can build URLs, and a UI can label the Connection, without either
   * ever seeing the key.
   *
   * The site URL is normalised here rather than at each use, so
   * `display.siteUrl` is a bare origin regardless of what the user pasted.
   */
  afterConnect({ credential }) {
    const cred = credential as Partial<DiscourseCredential>;
    if (!cred?.siteUrl) return {};
    let siteUrl: string;
    try {
      siteUrl = normalizeSiteUrl(cred.siteUrl);
    } catch {
      return {};
    }
    return {
      siteUrl,
      site: { host: new URL(siteUrl).host },
      user: { username: cred.apiUsername },
    };
  },
};

export default apiKey;

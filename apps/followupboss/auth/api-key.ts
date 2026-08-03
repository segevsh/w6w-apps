import type { AuthDefinition } from "@w6w/types";
import { API_URL } from "../lib/client.ts";

/**
 * Follow Up Boss API key — HTTP Basic with an EMPTY password, plus the two
 * registered-system headers.
 *
 * ## The wire format, confirmed by the server itself
 *
 * The Authentication page is unambiguous: "Authentication is done with HTTP
 * Basic Authentication over HTTPS. Use API Key as the username and leave the
 * password blank (or you can put any value as password if your HTTP client
 * requires it)." It also draws the line against the other scheme: "If you are
 * using API Keys to authenticate with Follow Up Boss, you **must** use Basic
 * Authentication. If you are using OAuth to authenticate with Follow Up Boss,
 * you **must** use Bearer Authentication."
 *
 * Every embedded OpenAPI document across the reference agrees, declaring the one
 * security scheme as `{"type": "http", "scheme": "basic"}`.
 *
 * This was not taken on documentation alone. An unauthenticated
 * `GET https://api.followupboss.com/v1/identity` on 2026-08-03 answered:
 *
 *     HTTP/2 401
 *     www-authenticate: Basic realm="Follow Up Boss API"
 *     content-type: application/json; charset=UTF-8
 *
 *     {"errorMessage":"Authentication is required. Use Basic HTTP Authentication
 *      with API Key as username and blank password, or use Bearer token
 *      authentication. See https://docs.followupboss.com/reference/authentication"}
 *
 * So the server names the scheme in its `WWW-Authenticate` challenge and repeats
 * the rule in the body. The encoded payload is therefore `${apiKey}:` — the
 * trailing colon is REQUIRED, and it is the whole subtlety. `base64("key")`
 * without it is a different string. `tests/auth/api-key.test.ts` pins the
 * encoding, including that the colon survives.
 *
 * ## Why `type: "basic"` and not `type: "apiKey"`
 *
 * The credential is conceptually an API key, but `ApiKeyConfig` can only express
 * "put this value, with this prefix, in this header/query/body slot". It cannot
 * express "base64 the value with a colon appended", so declaring `type: "apiKey"`
 * would describe a wire format this app does not use and a host could not
 * reproduce. `type: "basic"` plus an explicit `sign` hook is the accurate
 * description: Basic is genuinely what goes over the wire.
 *
 * There is deliberately no password field. The password is not a secret the user
 * has — it is fixed empty by the protocol — so prompting for it would only
 * invite someone to type something wrong.
 *
 * ## `X-System` / `X-System-Key` — the second half, and why they live HERE
 *
 * Follow Up Boss asks integrators to register their software and then identify
 * it on every call. From the Registration and Identification page: "We ask that
 * if you are accessing the Follow Up Boss API, you first register your system.
 * If you are accessing the FUB API in order to provide services to a FUB
 * customer, you MUST register your system. Every request to the API should
 * include the registered 'X-System' and 'X-System-Key' headers provided to you
 * after you register your system."
 *
 *     X-System: AwesomeWebsiteBuilder
 *     X-System-Key: 560270f7914b5b4a5f4dc1793ebc2796
 *
 * These are **credential material**, not request parameters, and they belong to
 * the integration rather than to the end user. They are stamped in `sign`
 * alongside the Basic header and are never reachable from an action —
 * `tests/index.test.ts` asserts no action so much as mentions them.
 *
 * ### They are optional here, and that is a deliberate, documented choice
 *
 * The API works without them; it just works *less*. The Rate Limiting page
 * publishes two tables, and the difference between them is the entire argument:
 *
 * | Context     | Registered | Unregistered |
 * | ----------- | ---------- | ------------ |
 * | `global`    | **250**    | **125**      |
 * | `events`    | 20         | 10           |
 * | `PUT.people`| 25         | 25           |
 * | `POST.events` | unlimited* | unlimited* |
 *
 * — "If you are making requests without a valid X-System-Key header, the allowed
 * rate is much lower." Roughly half. Two endpoints (`/rateLimit/usage` and
 * `/rateLimit/limits`) refuse outright without them, answering
 * `403 {"error": "Only registered systems can use this endpoint."}`.
 *
 * Marking them required would lock out every individual user connecting their
 * own account with their own key — a legitimate and common case the vendor
 * explicitly supports. Marking them optional and saying plainly what is lost is
 * the honest shape. The connect form says so; so does the README.
 *
 * ## A trap worth naming: `/me` returns the caller's own API key
 *
 * The obvious "whoami" probe on this API is `GET /me`, and it is the wrong one.
 * Its documented response schema includes an `apiKey` property — along with
 * `algoliaKey`, `callingCapabilityToken` and an `intercomSettings.user_hash` —
 * so the response body of `/me` is itself a bundle of secrets.
 *
 * `test` and `afterConnect` use **`GET /identity`** instead, which the docs
 * describe as providing "basic identifying information about the authenticated
 * user and the parent account" and whose entire documented response is:
 *
 *     {"account": {"id": 1234567, "domain": "example",
 *                  "owner": {"name": "John Doe", "email": "j.doe@example.com"}},
 *      "user": {"id": 2, "name": "Louis Tully", "email": "louis@example.com"}}
 *
 * Six harmless fields, no secrets, and it happens to carry the account label we
 * want anyway. Using `/me` would mean pulling a live API key into a hook whose
 * return value is stored as Connection display data and rendered in a UI. That
 * is a credential-into-logs bug waiting to happen, and it is avoided by picking
 * the smaller endpoint rather than by remembering to redact the bigger one.
 *
 * ## Permission scoping is real and shapes what a Connection can see
 *
 * "API key has the same access level as the user whom the key belongs to. For
 * example, agent's API key allows access only to people assigned to that agent
 * while broker's API key allows access to all people in the account." The four
 * documented levels are Owner, Admin (Broker), Agent and Lender — and notably
 * "An admin has most access to everything but they can not access Webhooks."
 *
 * This is why the liveness probe is `/identity` rather than a resource listing:
 * `GET /people` returning nothing is a legitimate result for an agent's key with
 * no assigned contacts, and reporting that as a broken credential would be
 * wrong.
 *
 * ## OAuth 2.0 exists
 *
 * Follow Up Boss also documents a full OAuth 2.0 flow (Getting Started with
 * OAuth, Authentication & Authorization, Token Lifetimes, Token Exchange
 * Response, Error Codes), which is the route for a listed partner integration.
 * We ship the API key because it needs no app registration, no redirect URI and
 * no client secret, and works in unattended background runs. Add a second
 * `AuthDefinition` of `type: "oauth2"` when this app is registered as a Follow
 * Up Boss partner.
 */

export interface FubCredential {
  apiKey: string;
  systemName?: string;
  systemKey?: string;
}

/**
 * Inlined base64 encoder — the app sandbox runs with `import: false`, so we
 * cannot pull `jsr:@std/encoding` at runtime. Same output as @std/encoding's
 * `encodeBase64`: standard base64 with `=` padding, no url-safe swaps.
 */
function encodeBase64(input: string): string {
  const bytes = new TextEncoder().encode(input);
  let s = "";
  for (const b of bytes) s += String.fromCharCode(b);
  return btoa(s);
}

/**
 * `Basic base64("<apiKey>:")`.
 *
 * The trailing colon is the empty password. Without it the base64 differs and
 * Follow Up Boss rejects the request.
 */
export function basicHeader(apiKey: string): string {
  return `Basic ${encodeBase64(`${apiKey}:`)}`;
}

/**
 * The one place the full header set is built. Exported so the `test` and
 * `afterConnect` hooks and the unit tests exercise the same code path `sign`
 * uses — a second, hand-rolled copy is exactly how the system headers go missing
 * on a probe and the rate limit silently halves.
 *
 * The system headers are omitted entirely when unset, rather than sent empty:
 * the docs condition the higher limits on "a valid X-System-Key header", and an
 * empty one is not valid — it is likelier to be treated as a malformed
 * registration than as an absent one.
 */
export function authHeaders(credential: Partial<FubCredential>): Record<string, string> {
  const headers: Record<string, string> = {
    authorization: basicHeader(credential.apiKey ?? ""),
  };
  if (credential.systemName) headers["X-System"] = credential.systemName;
  if (credential.systemKey) headers["X-System-Key"] = credential.systemKey;
  return headers;
}

const apiKey: AuthDefinition = {
  key: "api-key",
  type: "basic",
  displayName: "API Key",
  description:
    "Paste an API key from Follow Up Boss → Admin → API. Sent as HTTP Basic with the key as the " +
    "username and an empty password. Optionally add your registered system name and key, which " +
    "roughly doubles your rate limit.",
  connectionLabel: "{{user.email}} — {{account.domain}}",
  fields: [
    {
      key: "apiKey",
      label: "API Key",
      type: "secret",
      required: true,
      hint: "Follow Up Boss → Admin → API. The key inherits its owner's permission level, so an " +
        "agent's key sees only their own assigned contacts while an owner's or broker's key sees " +
        "the whole account. Use a broker/owner key for account-wide automation.",
    },
    {
      key: "systemName",
      label: "System name (X-System)",
      type: "string",
      required: false,
      placeholder: "AwesomeWebsiteBuilder",
      row: "system",
      hint: "The name you registered at apps.followupboss.com/system-registration. Optional, but " +
        "Follow Up Boss asks every integration to send it — and *requires* it if you are " +
        "accessing the API to provide services to a Follow Up Boss customer.",
    },
    {
      key: "systemKey",
      label: "System key (X-System-Key)",
      type: "secret",
      required: false,
      row: "system",
      hint:
        "The key issued with your system registration. Without it the global rate limit drops " +
        "from 250 to 125 requests per 10-second window (and the /rateLimit endpoints refuse the " +
        "call), so the Quota health check reports less headroom than a registered system gets.",
    },
  ],

  /**
   * The ONLY hook handed the raw credential, and it runs network-less: it stamps
   * the headers onto the outbound request and returns it.
   */
  sign({ request, credential }) {
    const cred = credential as Partial<FubCredential>;
    for (const [name, value] of Object.entries(authHeaders(cred))) {
      request.headers[name] = value;
    }
    return request;
  },

  /**
   * `GET /identity` — the narrowest probe available, and the safe one.
   *
   * See the module comment for why this is not `/me`: `/me` returns the caller's
   * own `apiKey`, `algoliaKey` and calling token in the response body, and a
   * liveness probe has no business pulling those across the sandbox boundary.
   *
   * `/identity` also needs no permission beyond existing, which matters on an
   * API where an agent's key legitimately sees almost nothing. Probing
   * `GET /people` instead would report a perfectly good agent key as broken.
   */
  async test({ credential }, ctx) {
    const cred = credential as Partial<FubCredential>;
    if (!cred?.apiKey) return { ok: false, message: "credential missing apiKey" };

    const res = await ctx.fetch(`${API_URL}/identity`, {
      headers: { accept: "application/json", ...authHeaders(cred) },
    });
    if (res.status === 401) {
      return { ok: false, message: "Follow Up Boss rejected the API key (401)" };
    }
    // 403 is its own story on this API and deserves its own sentence: an expired
    // account "enters a grace period, however the API key remains valid... the
    // account may be in a locked down state and will receive a 403 Forbidden
    // response for most other requests". The key is fine; the subscription is
    // not, and telling someone to regenerate their key would send them the wrong
    // way entirely.
    if (res.status === 403) {
      return {
        ok: false,
        message:
          "Follow Up Boss returned 403. The key itself may be valid — an expired Follow Up Boss " +
          "account keeps working for lead intake but locks down most other endpoints. Check the " +
          "account's billing status as well as the key's permission level.",
      };
    }
    if (!res.ok) {
      const body = await res.text().catch(() => "");
      let message: string | undefined;
      try {
        const parsed = JSON.parse(body) as { errorMessage?: string; error?: string };
        message = parsed.errorMessage ?? parsed.error;
      } catch {
        // Non-JSON body; the status alone is the more honest message.
      }
      return { ok: false, message: message ?? `Follow Up Boss returned HTTP ${res.status}` };
    }
    return { ok: true };
  },

  /**
   * Labels the Connection with who and where, from the same `/identity` payload.
   *
   * One cheap read, and every field copied out is one the docs list as part of
   * that endpoint's response: the user's id, name and email, and the account's
   * id and `domain` (the tenant's Follow Up Boss subdomain, which is the most
   * recognisable thing to show someone choosing between two Connections).
   *
   * Nothing here can carry credential material, by construction rather than by
   * redaction — `/identity` has no secret to leak, which is the reason it was
   * chosen over `/me`.
   */
  async afterConnect({ credential }, ctx) {
    const cred = credential as FubCredential;
    const res = await ctx.fetch(`${API_URL}/identity`, {
      headers: { accept: "application/json", ...authHeaders(cred) },
    });
    if (!res.ok) return {};
    const body = await res.json().catch(() => null) as {
      account?: { id?: number; domain?: string; owner?: { name?: string; email?: string } };
      user?: { id?: number; name?: string; email?: string };
    } | null;
    if (!body) return {};

    return {
      user: {
        id: body.user?.id,
        name: body.user?.name,
        email: body.user?.email,
      },
      account: {
        id: body.account?.id,
        domain: body.account?.domain,
      },
    };
  },
};

export default apiKey;

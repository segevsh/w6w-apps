import type { AuthDefinition } from "@w6w/types";
import { API, describeError, VERSION } from "../lib/client.ts";

/**
 * A balenaCloud API key — `Authorization: Bearer <key>`.
 *
 * ## Two things go in this field, and they behave differently
 *
 * - An **API key**, created in the dashboard under Preferences → Access
 *   tokens. It does not expire and it is what an automation should use.
 * - A **session token**, the JWT the dashboard and `balena login` hold. It
 *   works identically and *expires*, so a connection made with one stops
 *   working days later for no visible reason.
 *
 * balena accepts both in the same header with no way to tell them apart from
 * the outside — so `afterConnect` records which shape was given, and the test
 * says so.
 *
 * ## The test has to use an endpoint that actually needs the credential
 *
 * `/user/v1/whoami` does; `/v7/application` does not. Verified live: an
 * unauthenticated request for fleets returns **200** with the platform's
 * public fleets. A credential test written against the obvious listing
 * endpoint would pass with no credential at all, which is exactly the failure
 * a test exists to catch.
 */
const auth: AuthDefinition = {
  key: "api-key",
  type: "bearer",
  displayName: "API key",
  connectionLabel: "{{username}}",
  description:
    "A balenaCloud API key or session token. Prefer an API KEY — a session token expires and " +
    "takes the connection with it. Tested against `/user/v1/whoami`, because balena answers an " +
    "unauthenticated fleet listing with 200 and the platform's public fleets.",
  fields: [
    {
      key: "apiKey",
      label: "API key",
      type: "secret",
      required: true,
      hint: "Dashboard → Preferences → Access tokens → Create API key. A session token from " +
        "`balena login` also works and will expire.",
    },
  ],

  sign({ request, credential }) {
    const apiKey = String((credential as Record<string, unknown>)?.apiKey ?? "");
    return {
      ...request,
      headers: { ...request.headers, authorization: `Bearer ${apiKey}` },
    };
  },

  async test({ credential }, ctx) {
    let res: Response;
    try {
      // NOT /application — that answers 200 without any credential at all.
      res = await ctx.fetch(`${API}/user/v1/whoami`, { headers: { accept: "application/json" } });
    } catch (err) {
      return { ok: false, message: `could not reach the balena API: ${String(err)}` };
    }
    const text = await res.text().catch(() => "");
    if (!res.ok) return { ok: false, message: describeError(res.status, text) };

    interface WhoAmI {
      username?: string;
      email?: string;
      id?: number;
    }
    let user: WhoAmI = {};
    try {
      user = JSON.parse(text) as WhoAmI;
    } catch { /* an unexpected shape is still an authenticated call */ }

    const looksLikeJwt = String((credential as Record<string, unknown>)?.apiKey ?? "")
      .split(".").length === 3;

    return {
      ok: true,
      message: `authenticated as ${user.username ?? user.email ?? "an unnamed actor"}` +
        (looksLikeJwt
          ? ". This credential is a SESSION TOKEN rather than an API key — it will expire, and " +
            "the connection will stop working when it does"
          : ""),
    };
  },

  async afterConnect({ credential }, ctx) {
    const apiKey = String((credential as Record<string, unknown>)?.apiKey ?? "");
    let username = "";
    try {
      const res = await ctx.fetch(`${API}/user/v1/whoami`, {
        headers: { accept: "application/json" },
      });
      if (res.ok) {
        username = String(((await res.json()) as { username?: string })?.username ?? "");
      }
    } catch { /* the label is a convenience, not a gate */ }

    return {
      username,
      apiVersion: VERSION,
      credentialKind: apiKey.split(".").length === 3 ? "session token" : "API key",
    };
  },
};

export default auth;

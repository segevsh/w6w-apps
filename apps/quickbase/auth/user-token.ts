import type { AuthDefinition } from "@w6w/types";
import { apiBase } from "../lib/client.ts";

/**
 * Quickbase **user token** — the only credential this app accepts.
 *
 * ## The wire format, and the version of it that is wrong
 *
 * ```
 * Authorization: QB-USER-TOKEN b1234567_abc_defghijklmnopqrstuvw
 * QB-Realm-Hostname: acme.quickbase.com
 * ```
 *
 * A scheme name, a space, the token. Community posts and at least one
 * integration guide circulate a `QB-USER-TOKEN user_token=<token>` form; it is
 * **wrong**, and this app does not emit it. Two independent statements from
 * Quickbase's own developer portal (verified 2026-08-03) settle it:
 *
 *   1. The Swagger document the portal ships declares the header on every
 *      operation with `"example": "QB-USER-TOKEN xxxxxx_xxx_xxxxxxxxxxxxxxxxxxxxxxx"`.
 *   2. The portal's own client-side validator for the field is the regex
 *      `/(QB-USER-TOKEN|QB-TEMP-TOKEN) [a-zA-Z0-9_]+/gi` — which a
 *      `user_token=` value cannot match, because of the `=`.
 *
 * `tests/auth/user-token.test.ts` pins the space form both ways.
 *
 * ## Why the realm is a credential field and not an action param
 *
 * Quickbase is addressed per realm (`acme.quickbase.com`) but the API is not
 * hosted there — the realm travels as the `QB-Realm-Hostname` header on a call
 * to the fixed `api.quickbase.com` host (see `lib/client.ts` for the evidence).
 * A token is minted inside exactly one realm and is meaningless outside it, so
 * the pair belongs to the Connection. Keeping it here also means the header is
 * set in `sign` and nowhere else, which is the property that lets every Action
 * stay ignorant of the credential.
 *
 * ## Why an application id is required at connect time
 *
 * Quickbase publishes no "who am I" endpoint. There is no `/users/me`: the
 * closest thing, `POST /users`, is an account-level directory lookup that a
 * per-app token is not entitled to. Every other read needs a concrete target.
 *
 * That is not a shortcoming to route around — it reflects how the credential
 * actually works. A user token is *assigned to applications*; one that is
 * assigned to nothing can do nothing. So the connection collects the app it is
 * for, and `test` reads that app back. A single call then proves all three
 * things that can be wrong at once: the token is live, the realm is right, and
 * the token is assigned to this app. A user whose token covers several apps
 * overrides it per action with the `appId` param.
 *
 * ## Deliberately not offered here
 *
 * - **Temporary tokens** (`QB-TEMP-TOKEN`, `GET /auth/temporary/{dbid}`).
 *   Quickbase's own docs scope these to code pages: they are minted from the
 *   *browser session*, "can only be used inside of code pages for client-side
 *   authentication because it relies on the browser session". A server-side
 *   sandbox has no such session, so this would be an auth method that could
 *   never connect.
 * - **`POST /auth/oauth/token` (`exchangeSsoToken`)** is SAML-assertion
 *   exchange for realms running SSO, not a user-facing OAuth 2 authorization-code
 *   flow — there is no `authorizationUrl` to send anyone to. Modelling it as
 *   `type: "oauth2"` would describe a flow that does not exist.
 * - **App tokens** (`QB-App-Token`) are not a credential; they are a
 *   per-application gate that a realm may additionally require. No app in this
 *   pack has one to test against, and shipping an untested optional header that
 *   silently does nothing is worse than omitting it.
 */
const userToken: AuthDefinition = {
  key: "user-token",
  type: "custom",
  displayName: "User Token",
  description:
    "Mint a user token from My Preferences → Manage user tokens in your Quickbase realm, then assign it to the application you want to automate.",
  connectionLabel: "{{app.name}} ({{realm}})",
  fields: [
    {
      key: "realm",
      label: "Realm hostname",
      type: "string",
      required: true,
      placeholder: "acme.quickbase.com",
      hint:
        "The full realm hostname you sign in to, including the domain — not just the subdomain.",
    },
    {
      key: "userToken",
      label: "User token",
      type: "secret",
      required: true,
      hint:
        "My Preferences → Manage user tokens → New user token. Assign the token to the application below.",
    },
    {
      key: "appId",
      label: "Default application ID",
      type: "string",
      required: true,
      placeholder: "bqrxxxxxx",
      hint:
        "The app id from its URL: quickbase.com/db/<appId>. Used to verify the token, and as the default for actions that take an application.",
    },
  ],

  /**
   * `type: "custom"` rather than `"apiKey"` on purpose.
   *
   * `ApiKeyConfig` can express "put this value, with this prefix, in this
   * header" — which covers `Authorization` alone. It cannot express the second,
   * mandatory header carrying a *different* field of the same credential. A
   * declarative description that produced only half the required headers would
   * be a description of a request Quickbase rejects, so the honest declaration
   * is `custom` plus an explicit `sign`.
   */
  sign({ request, credential }) {
    const { userToken: token, realm } = credential as { userToken: string; realm: string };
    request.headers["authorization"] = `QB-USER-TOKEN ${token}`;
    request.headers["qb-realm-hostname"] = realm;
    return request;
  },

  async test({ credential }, ctx) {
    const { realm, userToken: token, appId } = credential as {
      realm?: string;
      userToken?: string;
      appId?: string;
    };
    if (!realm || !token || !appId) {
      return { ok: false, message: "credential missing realm, userToken or appId" };
    }

    // `test` runs before a Connection exists, so `sign` has not been wired up
    // yet and the headers are set here from the credential the host just
    // collected. This is the one hook besides `sign` that is handed the
    // credential, and the values go into headers only — never into the URL,
    // never into the message returned below.
    const res = await ctx.fetch(`${apiBase(realm)}/apps/${encodeURIComponent(appId)}`, {
      headers: {
        "authorization": `QB-USER-TOKEN ${token}`,
        "qb-realm-hostname": realm,
      },
    });
    if (!res.ok) {
      // Quickbase answers 401 for a token it does not recognise and 403 for one
      // that is real but not assigned to this app — worth telling apart, since
      // the fixes are different (mint a new token vs. assign the existing one).
      const hint = res.status === 403
        ? " — token is not assigned to this application"
        : res.status === 401
        ? " — token not recognised in this realm"
        : "";
      return { ok: false, message: `Quickbase returned ${res.status}${hint}` };
    }
    return { ok: true };
  },

  /**
   * Records the realm and app id on the Connection so `lib/client.ts` can pick
   * the API host and default the application, and so the connection label reads
   * as something a human recognises.
   *
   * Only non-secret material is published: a realm is a public hostname and an
   * app id appears in every Quickbase URL. The token is not returned.
   */
  async afterConnect({ credential }, ctx) {
    const { realm, appId } = credential as { realm?: string; appId?: string };
    if (!realm || !appId) return {};

    const res = await ctx.fetch(`${apiBase(realm)}/apps/${encodeURIComponent(appId)}`);
    if (!res.ok) return { realm, appId };

    const app = await res.json().catch(() => ({})) as { id?: string; name?: string };
    return {
      realm,
      appId,
      app: { id: app.id ?? appId, name: app.name ?? appId },
    };
  },
};

export default userToken;

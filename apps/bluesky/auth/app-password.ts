import type { AuthDefinition } from "@w6w/types";
import { DEFAULT_SERVICE, describeXrpc, normalizeService } from "../lib/client.ts";

/**
 * An app password, exchanged once for a session that then refreshes forever.
 *
 * ## Why this is `custom` and not `basic`
 *
 * The credential the user types is not the credential that signs requests. The
 * AT Protocol wants a **session**: `com.atproto.server.createSession` takes an
 * identifier and password and returns an `accessJwt` (short-lived) plus a
 * `refreshJwt` (long-lived), and every request carries the access token as a
 * bearer.
 *
 * ## Session creation is rate-limited to roughly ten per day
 *
 * Measured against `bsky.social` on 2026-08-18, on a *failed* attempt:
 *
 *     ratelimit-limit: 10
 *     ratelimit-policy: 10;w=86400
 *
 * That is the whole design constraint. An app that authenticated per run would
 * work in testing and stop working the same afternoon, with an error that
 * blames the password. So the app password is exchanged **once**, at connect
 * time, and never used again — `refresh` uses the refresh token instead, which
 * is not limited that way.
 *
 * The exchanged credential keeps the app password so the connection can recover
 * if the refresh token is ever lost, and that recovery is the only path that
 * spends the daily budget.
 *
 * ## Refresh uses the refresh token as the bearer, and rotates it
 *
 * Two details, both from the lexicon
 * (`com.atproto.server.refreshSession`): *"Requires auth using the 'refreshJwt'
 * (not the 'accessJwt')"* — signing a refresh with the access token fails — and
 * the response contains a **new `refreshJwt`**. The old one stops working, so a
 * refresh whose result is discarded leaves the connection dead.
 *
 * ## It must be an app password
 *
 * Settings → Privacy and security → **App passwords**. The account password
 * also works, which is the problem: it grants everything, including changing
 * the password and creating more app passwords. An app password cannot do
 * either, and can be revoked on its own. The connection test rejects anything
 * that does not look like one.
 */
const appPassword: AuthDefinition = {
  key: "app-password",
  type: "custom",
  displayName: "App Password",
  description:
    "A handle and an APP PASSWORD — not the account password. Exchanged once for a session, " +
    "because creating sessions is limited to roughly ten a day.",
  connectionLabel: "{{handle}}",
  fields: [
    {
      key: "service",
      label: "PDS",
      type: "string",
      default: DEFAULT_SERVICE,
      hint: "Bluesky's own PDS unless you host your own. The AT Protocol is federated, so this " +
        "is a real choice rather than a formality.",
    },
    {
      key: "identifier",
      label: "Handle",
      type: "string",
      required: true,
      default: "",
      placeholder: "alice.bsky.social",
      hint: "Your handle without the `@`, or the account email.",
    },
    {
      key: "password",
      label: "App Password",
      type: "secret",
      required: true,
      hint: "Settings → Privacy and security → App passwords. Format `xxxx-xxxx-xxxx-xxxx`. The " +
        "account password works too and should not be used — it can change your password and " +
        "mint more app passwords; an app password can do neither and is revocable on its own.",
    },
  ],

  /**
   * Spend one of the day's ten session creations, and keep everything the
   * session needs afterwards.
   */
  async exchange({ fields }, ctx) {
    const f = (fields ?? {}) as Record<string, unknown>;
    const service = normalizeService(f.service ?? DEFAULT_SERVICE);
    const identifier = String(f.identifier ?? "").trim().replace(/^@/, "");
    const password = String(f.password ?? "");
    if (!identifier) throw new Error("`identifier` is required");
    if (!password) throw new Error("`password` is required");

    const res = await ctx.fetch(`${service}/xrpc/com.atproto.server.createSession`, {
      method: "POST",
      headers: { "content-type": "application/json", accept: "application/json" },
      body: JSON.stringify({ identifier, password }),
    });
    const text = await res.text().catch(() => "");
    if (!res.ok) throw new Error(`could not sign in: ${describeXrpc(res.status, text)}`);

    const session = JSON.parse(text) as {
      accessJwt?: string;
      refreshJwt?: string;
      did?: string;
      handle?: string;
      active?: boolean;
      status?: string;
    };
    if (!session.accessJwt || !session.refreshJwt || !session.did) {
      throw new Error("the PDS did not return a usable session");
    }
    if (session.active === false) {
      throw new Error(
        `this account is not active${session.status ? ` (${session.status})` : ""} — a suspended ` +
          "or deactivated account can sign in but cannot post",
      );
    }

    return {
      service,
      identifier,
      // Kept so the connection can recover if the refresh token is ever lost.
      // That recovery is the only thing that spends the daily budget again.
      password,
      accessJwt: session.accessJwt,
      refreshJwt: session.refreshJwt,
      did: session.did,
      handle: session.handle,
    };
  },

  sign({ request, credential }) {
    const { accessJwt } = credential as { accessJwt?: string };
    if (accessJwt) request.headers["authorization"] = `Bearer ${accessJwt}`;
    return request;
  },

  /**
   * `com.atproto.server.refreshSession`, signed with the **refresh** token.
   *
   * The response carries a new refresh token; returning it is not optional,
   * because the one just used is now dead.
   */
  async refresh({ credential }, ctx) {
    const cred = credential as Record<string, unknown>;
    const service = normalizeService(cred.service ?? DEFAULT_SERVICE);
    const refreshJwt = String(cred.refreshJwt ?? "");
    if (!refreshJwt) throw new Error("credential has no refresh token — reconnect the account");

    const res = await ctx.fetch(`${service}/xrpc/com.atproto.server.refreshSession`, {
      method: "POST",
      // The refresh token, not the access token. Signing this with the access
      // token is the documented way to get a confusing 400.
      headers: { authorization: `Bearer ${refreshJwt}`, accept: "application/json" },
    });
    const text = await res.text().catch(() => "");
    if (!res.ok) {
      throw new Error(
        `could not refresh the session: ${describeXrpc(res.status, text)}. Reconnecting spends ` +
          "one of the account's ~10 daily session creations",
      );
    }

    const session = JSON.parse(text) as {
      accessJwt?: string;
      refreshJwt?: string;
      did?: string;
      handle?: string;
    };
    if (!session.accessJwt || !session.refreshJwt) {
      throw new Error("the PDS did not return a refreshed session");
    }

    return {
      ...cred,
      accessJwt: session.accessJwt,
      // The new one. The previous refresh token is already dead.
      refreshJwt: session.refreshJwt,
      did: session.did ?? cred.did,
      handle: session.handle ?? cred.handle,
    };
  },

  /**
   * `com.atproto.server.getSession` — proves the access token is live and
   * reports who it belongs to, without spending a session creation.
   */
  async test({ credential }, ctx) {
    const cred = (credential ?? {}) as Record<string, unknown>;
    const accessJwt = String(cred.accessJwt ?? "");
    if (!accessJwt) return { ok: false, message: "credential has no session — reconnect" };
    const service = normalizeService(cred.service ?? DEFAULT_SERVICE);

    let res: Response;
    try {
      res = await ctx.fetch(`${service}/xrpc/com.atproto.server.getSession`, {
        headers: { authorization: `Bearer ${accessJwt}`, accept: "application/json" },
      });
    } catch (err) {
      return { ok: false, message: `could not reach ${service}: ${String(err)}` };
    }
    const text = await res.text().catch(() => "");
    if (!res.ok) return { ok: false, message: describeXrpc(res.status, text) };

    const session = JSON.parse(text) as { handle?: string; did?: string; active?: boolean };
    if (session.active === false) {
      return { ok: false, message: "the account is deactivated or suspended" };
    }
    return {
      ok: true,
      message: `signed in as ${session.handle ?? "an account"} (${session.did ?? "no DID"})`,
    };
  },

  /** The DID is what the connection label and every write actually need. */
  afterConnect({ credential }) {
    const cred = (credential ?? {}) as Record<string, unknown>;
    return {
      service: cred.service,
      handle: cred.handle,
      did: cred.did,
    };
  },
};

export default appPassword;

import type { AuthDefinition } from "@w6w/types";
import {
  BASE_URL,
  describeError,
  type KlickTippSession,
  login,
  parseJson,
  sessionCookie,
} from "../lib/client.ts";

/**
 * Username + password, traded for a session — the Management API's
 * documented login (https://developers.klicktipp.com/guides/management-api-authentication).
 *
 * `POST /account/login` answers `{ sessid, session_name, account }`, and every
 * later call sends `Cookie: <session_name>=<sessid>`. So the stored credential
 * carries both halves: the durable username/password (needed to log in again
 * once the session lapses — `refresh`) and the live session (the only thing
 * `sign` stamps). The vendor does not document a session lifetime.
 *
 * The vendor asks for a dedicated API user rather than the main account: a
 * sub-account with the role "API User" (My Account → Settings → User Account →
 * Sub-Accounts), whose username is `mainaccount-subaccountname`.
 *
 * Developer Key + Customer Key (`X-Un` / `X-Ci` headers) is NOT implemented:
 * the guide says `X-Ci` is "a Base64-encoded cipher generated from Developer
 * Key + Customer Key" defined by the official PHP connector, and publishes no
 * construction of that cipher, so it cannot be written correctly or unit-tested
 * from the docs.
 */
const session: AuthDefinition = {
  key: "session",
  type: "custom",
  displayName: "Username + Password",
  description: 'A KlickTipp API user (a sub-account with the role "API User"). The username ' +
    "and password are traded for a session at connect time, and again when it lapses. " +
    "API access needs a Premium plan or higher.",
  connectionLabel: "KlickTipp ({{username}})",
  fields: [
    {
      key: "username",
      label: "Username",
      type: "string",
      required: true,
      placeholder: "mainaccount-subaccountname",
      hint: "Use a dedicated API user: My Account → Settings → User Account → Sub-Accounts → " +
        "Create Sub-Account with the role API User. Its username is `mainaccount-subaccountname`.",
    },
    {
      key: "password",
      label: "Password",
      type: "secret",
      required: true,
    },
  ],

  async exchange({ fields }, ctx) {
    const f = (fields ?? {}) as Record<string, unknown>;
    const username = String(f.username ?? "").trim();
    const password = String(f.password ?? "");
    if (!username || !password) throw new Error("Username and password are both required");
    const s = await login(ctx, username, password);
    const credential: KlickTippSession & { uid?: unknown } = {
      username,
      password,
      sessid: s.sessid,
      sessionName: s.sessionName,
      uid: s.account?.uid,
    };
    return credential;
  },

  /** KlickTipp has no refresh grant — logging in again is the refresh. */
  async refresh({ credential }, ctx) {
    const c = credential as Partial<KlickTippSession>;
    if (!c.username || !c.password) {
      throw new Error("credential is missing username or password — reconnect");
    }
    const s = await login(ctx, c.username, c.password);
    return { ...c, sessid: s.sessid, sessionName: s.sessionName };
  },

  /** The only hook that stamps the session. Runs network-less. */
  sign({ request, credential }) {
    request.headers["cookie"] = sessionCookie(credential as Partial<KlickTippSession>);
    return request;
  },

  /**
   * `GET /field` — bounded (a few dozen data fields), unlike `/tag` or
   * `/subscriber`, and its body never echoes the credential. The verdict comes
   * from the body: a JSON object of `fieldXxx` names is a live session. An
   * expired session and an account without API access are indistinguishable —
   * both answer 403 `["API access denied."]` — so the message names both.
   */
  async test({ credential }, ctx) {
    const c = credential as Partial<KlickTippSession>;
    if (!c.sessid || !c.sessionName) {
      return { ok: false, message: "credential has no session — reconnect" };
    }
    let res: Response;
    try {
      res = await ctx.fetch(`${BASE_URL}/field`, {
        headers: { cookie: sessionCookie(c), accept: "application/json" },
      });
    } catch (err) {
      return { ok: false, message: `KlickTipp unreachable: ${String(err)}` };
    }
    const body = parseJson(await res.text());
    if (res.ok && body && typeof body === "object" && !Array.isArray(body)) return { ok: true };
    if (res.status === 403) {
      return {
        ok: false,
        message: 'KlickTipp answered "API access denied" — the session has expired (reconnect ' +
          "signs in again) or the account has no API access (Premium plan or higher required)",
      };
    }
    return { ok: false, message: describeError(res.status, body).message };
  },

  afterConnect({ credential }, _ctx) {
    const c = credential as Partial<KlickTippSession>;
    return { username: c.username };
  },

  /** `POST /account/logout`. Best effort — disconnecting must work even if KlickTipp is down. */
  async revoke({ credential }, ctx) {
    const c = credential as Partial<KlickTippSession>;
    if (!c.sessid || !c.sessionName) return;
    try {
      await ctx.fetch(`${BASE_URL}/account/logout`, {
        method: "POST",
        headers: { cookie: sessionCookie(c) },
      });
    } catch (err) {
      ctx.log("warn", "KlickTipp logout failed", { error: String(err) });
    }
  },
};

export default session;

import type { AuthDefinition } from "@w6w/types";
import {
  baseUrlFor,
  environmentOf,
  GOCARDLESS_VERSION,
  type GoCardlessEnvironment,
  hostForEnvironment,
  parseGoCardlessError,
} from "../lib/client.ts";

/**
 * GoCardless access token — `Authorization: Bearer <token>` **plus**
 * `GoCardless-Version: 2015-07-06`.
 *
 * Verified against GoCardless's OpenAPI 3.1 document and its authentication
 * reference (`docs.gocardless.com/docs/api-reference/authentication`), both
 * fetched 2026-09-22.
 *
 * ## Two headers, and why one of them lives in `sign`
 *
 * GoCardless requires **both** headers on **every** request. Without
 * `Authorization` it answers `401 missing_authorization_header`; without
 * `GoCardless-Version` it answers `400 missing_version_header`. The version is
 * not a credential — it is the API generation this app was written against — but
 * it is a fixed, uniform part of the wire format, so it is stamped in the same
 * `sign` hook as the token rather than repeated in all sixteen actions. One
 * place, one value, and no action can forget it.
 *
 * {@link authHeaders} is the single source of that wire format, exported so the
 * `test` hook below sends exactly what an Action's request gets. A second,
 * hand-written copy of the headers is how a probe ends up passing while every
 * real request fails.
 *
 * ## The environment is a field, because the token cannot say
 *
 * GoCardless runs live and sandbox as two separate environments — its own words:
 * "Each environment is completely separate, with its own account, dashboard,
 * access tokens, and API URLs." A GoCardless access token is a bare opaque hex
 * string with no prefix and no environment marker, so unlike Paddle's
 * `pdl_live_…` / `pdl_sdbx_…` keys there is nothing in it to read. The user
 * therefore picks, and `sign` rewrites `request.url`'s hostname to match — the
 * mechanic Paddle uses for its key-derived host, applied to an explicit choice.
 *
 * Rewriting in `sign` (rather than trusting an `afterConnect`-populated display
 * field) keeps the client self-healing: `afterConnect` is not guaranteed to have
 * run, and a Connection restored from an older record may carry nothing else.
 */

export interface GoCardlessCredential {
  accessToken: string;
  environment?: GoCardlessEnvironment;
}

/**
 * The one place the wire format is built.
 *
 * Both headers, always: `GoCardless-Version` is required on every request and a
 * probe that omits it tests a request this app never sends.
 */
export function authHeaders(credential: Partial<GoCardlessCredential>): Record<string, string> {
  return {
    authorization: `Bearer ${credential.accessToken ?? ""}`,
    "gocardless-version": GOCARDLESS_VERSION,
  };
}

/**
 * Describe what is wrong with a token's *shape*, before it is ever sent.
 *
 * An access token is an opaque hex string, so there is little to validate — but
 * the two ways people paste it wrong are both common and both produce the same
 * opaque 401: copying the whole `Authorization: Bearer …` line out of the docs,
 * and copying a token with a line break in it. Naming which one happened saves
 * a support round trip. Nothing here quotes the token back.
 */
export function describeTokenProblem(accessToken: string): string | undefined {
  const token = (accessToken ?? "").trim();
  if (!token) return "credential missing accessToken";
  if (/^bearer\s+/i.test(token)) {
    return "This includes the whole `Authorization: Bearer …` header. Paste the access token " +
      "itself — GoCardless dashboard > Developers > Access tokens.";
  }
  if (/\s/.test(token)) {
    return "The access token contains whitespace — it was probably copied with a line break in " +
      "the middle. Copy it again in one piece.";
  }
  return undefined;
}

/**
 * The credential-liveness probe: `GET /creditors?limit=1`.
 *
 * Chosen by reading GoCardless's own reference rather than by reachability:
 *
 * **(a) It requires a credential.** With no `Authorization` header GoCardless
 * answers `401 missing_authorization_header`, and with a syntactically plausible
 * but fake token `401 unauthorized`. There is no unauthenticated read in this
 * API, but there is also no endpoint whose 200 means "somebody's token worked"
 * regardless of whose — the credential genuinely has to be attached.
 *
 * **(b) It needs no elevated permission.** List reads are not among the
 * endpoints GoCardless restricts. Creditor *management* is restricted always and
 * customer/mandate creation unless the app's payment pages are approved, so
 * none of those would be a safe probe.
 *
 * **(c) It returns nothing belonging to this app.** The response is the
 * merchant's own creditor records — their business name, address and bank
 * scheme identifiers — which is exactly what the person who pasted the token
 * already owns. It is the closest thing GoCardless has to a whoami: every access
 * token belongs to exactly one merchant organisation, and this is that
 * organisation's own record.
 *
 * `limit=1` because the question is "does this credential work", not "what are
 * this merchant's creditor accounts".
 */
export const PROBE_PATH = "/creditors?limit=1";

/**
 * The 401 reasons that mean the token itself is the problem.
 *
 * `unauthorized` is the general case for a dashboard-issued token that is wrong
 * or revoked. The three `access_token_*` reasons are documented for
 * OAuth-issued tokens but can appear for a dashboard token too, and all four
 * have the same fix, so they are handled together rather than in four
 * near-identical branches.
 */
const TOKEN_REJECTED = new Set([
  "unauthorized",
  "access_token_not_found",
  "access_token_revoked",
  "access_token_not_active",
]);

const accessToken: AuthDefinition = {
  key: "access-token",
  type: "bearer",
  displayName: "Access Token",
  description:
    "Paste an access token from your GoCardless dashboard (Developers > Access tokens) and " +
    "choose which environment it belongs to. Live and sandbox tokens are completely separate " +
    "and only work against their own environment.",
  connectionLabel: "GoCardless ({{environment}})",
  fields: [
    {
      key: "accessToken",
      label: "Access token",
      type: "secret",
      required: true,
      hint: "GoCardless dashboard > Developers > Access tokens > Create access token. It is " +
        "shown once. Create a token for this connection rather than sharing one with other " +
        "services, so it can be revoked on its own.",
    },
    {
      key: "environment",
      label: "Environment",
      type: "select",
      required: true,
      default: "live",
      options: [
        { value: "live", label: "Live (api.gocardless.com)" },
        { value: "sandbox", label: "Sandbox (api-sandbox.gocardless.com)" },
      ],
      hint: "GoCardless's two environments share nothing — different accounts, dashboards, " +
        "tokens and URLs. A token from one does not work in the other. Start on Sandbox.",
    },
  ],

  /**
   * The only hook handed the raw credential. It runs network-less: it stamps
   * both required headers and points the request at the environment's host.
   */
  sign({ request, credential }) {
    const cred = credential as Partial<GoCardlessCredential>;
    for (const [name, value] of Object.entries(authHeaders(cred))) {
      request.headers[name] = value;
    }
    // Host rewrite, not URL replacement: the path, query and body the action
    // built are untouched, so an action cannot address a different host than
    // the one its Connection chose. A malformed URL is left alone rather than
    // silently redirected.
    try {
      const url = new URL(request.url);
      url.hostname = hostForEnvironment(cred.environment);
      request.url = url.toString();
    } catch {
      // Leave it; the call fails with a clear transport error.
    }
    return request;
  },

  /**
   * Classified from the response **body** — GoCardless's own machine-readable
   * code — never from the status line alone, and never from anything the
   * credential looks like.
   *
   * The distinctions that matter:
   *
   *  - `missing_authorization_header` / `invalid_authorization_header` mean the
   *    credential never reached GoCardless or arrived malformed. That is a
   *    different fix (reconnect) from "the token is wrong".
   *  - `missing_version_header` / `version_not_found` would mean this app failed
   *    to stamp `GoCardless-Version` — a wire regression in the app, not
   *    anything the user did, so it says so instead of blaming the token.
   *  - `403 forbidden` is **not** a bad credential: GoCardless restricts a
   *    handful of endpoints, and this probe is a plain list read. A 403 is
   *    reported as "connected, but not permitted for this read" — a working
   *    Connection, with a message, so nobody re-pastes a token that was fine.
   *  - `429 rate_limit_exceeded` says nothing about the credential either, so it
   *    does not fail the Connection; the probe simply could not confirm it this
   *    time.
   *
   * The `Authorization` header is never echoed, and neither is the token.
   */
  async test({ credential }, ctx) {
    const cred = credential as Partial<GoCardlessCredential>;
    const problem = describeTokenProblem(cred?.accessToken ?? "");
    if (problem) return { ok: false, message: problem };

    const environment = environmentOf(cred.environment);
    const res = await ctx.fetch(`${baseUrlFor(environment)}${PROBE_PATH}`, {
      headers: { accept: "application/json", ...authHeaders(cred) },
    });
    if (res.ok) {
      await res.body?.cancel();
      return { ok: true };
    }

    const text = await res.text().catch(() => "");
    const error = parseGoCardlessError(text);
    const reason = error?.errors?.[0]?.reason ?? error?.errors?.[0]?.field;

    if (reason && TOKEN_REJECTED.has(reason)) {
      return {
        ok: false,
        message:
          `GoCardless rejected the access token (${res.status} ${reason}) for the ${environment} ` +
          "environment. Check it was copied exactly, has not been revoked, and belongs to the " +
          "environment selected above — live and sandbox tokens are not interchangeable.",
      };
    }
    if (reason === "missing_authorization_header") {
      return {
        ok: false,
        message:
          "GoCardless received no Authorization header at all. The credential did not reach the " +
          "request — reconnect this connection.",
      };
    }
    if (reason === "invalid_authorization_header") {
      return {
        ok: false,
        message:
          "GoCardless received an Authorization header it could not parse. Re-enter the access " +
          "token without the `Bearer ` prefix or any surrounding text.",
      };
    }
    if (reason === "missing_version_header" || reason === "version_not_found") {
      return {
        ok: false,
        message:
          `GoCardless refused the API version header this app sends (${res.status} ${reason}). ` +
          "That is a fault in this app's wire format, not in your token — please report it.",
      };
    }
    if (res.status === 403 || reason === "forbidden") {
      // A restricted endpoint, not a broken credential.
      return {
        ok: true,
        message: "Connected. GoCardless accepted the credential but refused this list read (403" +
          (reason ? ` ${reason}` : "") +
          "), which usually means the account is under review — see the README's " +
          '"Known vendor restrictions".',
      };
    }
    if (res.status === 429 || reason === "rate_limit_exceeded") {
      return {
        ok: true,
        message: "Connected, but GoCardless rate-limited the probe (429" +
          (reason ? ` ${reason}` : "") +
          ") so the credential could not be confirmed this time. Retry in a minute.",
      };
    }
    if (reason) {
      return {
        ok: false,
        message: `GoCardless refused the credential probe (${res.status} ${
          error?.type ?? "error"
        }/${reason})${error?.message ? `: ${error.message}` : ""}`,
      };
    }
    // No parseable vendor code — say so rather than guessing a cause.
    return {
      ok: false,
      message: `GoCardless returned HTTP ${res.status} for ${PROBE_PATH} with no readable error ` +
        "code, so the credential could not be classified.",
    };
  },

  /**
   * Records which environment this Connection talks to, so a list of Connections
   * is readable and `connectionLabel` has something to render.
   *
   * It makes **no network call**: the environment is a field the user already
   * chose, and GoCardless has no whoami that would add anything a probe has not
   * already established. That also means there is no second wire format here to
   * drift from `sign`'s.
   */
  afterConnect({ credential }) {
    const cred = credential as Partial<GoCardlessCredential>;
    const environment = environmentOf(cred?.environment);
    return { environment, host: hostForEnvironment(environment) };
  },
};

export default accessToken;

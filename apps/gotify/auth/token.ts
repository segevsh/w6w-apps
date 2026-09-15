import type { AuthDefinition } from "@w6w/types";
import { API_PATH, normalizeBaseUrl } from "../lib/client.ts";
import type { GotifyErrorBody } from "../lib/client.ts";

/**
 * A Gotify client token, sent as `X-Gotify-Key`.
 *
 * ## Two token types, and why this app asks for the other one
 *
 * Gotify issues two kinds of token: an **application token**, meant for
 * whatever *sends* notifications, and a **client token**, meant for whatever
 * *receives and manages* them — the Android/iOS/web apps, and anything that
 * lists, prunes or configures. `POST /message` alone accepts either; every
 * other action here (listing/pruning messages, and managing applications and
 * clients) requires a client token specifically. So this app asks for a
 * client token, not an application one — an application token pasted in here
 * will send messages fine and then 403 on everything else, which is a
 * confusing way to discover the distinction after the fact.
 *
 * ## The header is `X-Gotify-Key`, not `Authorization: Bearer`
 *
 * Gotify accepts three equivalent forms — the `X-Gotify-Key` header, an
 * `Authorization: Bearer <token>` header, or a `?token=` query parameter
 * (`docs/spec.json` `info.description`, `gotify/server` `auth/authentication.go`).
 * `X-Gotify-Key` is used here because it needs no prefix to get wrong and,
 * unlike the query parameter, never lands a credential in a URL, proxy log or
 * browser history.
 *
 * ## Two management endpoints this app deliberately does not expose
 *
 * `DELETE /application/{id}` and `DELETE /client/{id}` sit behind
 * `RequireElevatedClient` in the server's router (`router/router.go`) — a
 * FRESH, WebAuthn re-authenticated client session, not just a valid token. A
 * stored API credential has no way to perform that ceremony, so calling
 * either with a plain client token 403s with `"session not elevated, use
 * basic auth or call /client:elevate"` regardless of how new or
 * fully-privileged the token is (`auth/authentication.go`, `checkClientElevated`).
 * The message says basic auth (a username + password) is the one thing that
 * *does* satisfy it — but that trades a revocable, scoped token for the
 * account password, for the sake of two destructive actions, so it is left
 * out here rather than offered as a second auth method. `application-update`
 * and `client-update` are unaffected: only the two deletes are elevation-gated.
 */
const token: AuthDefinition = {
  key: "client-token",
  type: "custom",
  displayName: "Client Token",
  description:
    "A Gotify instance URL plus a CLIENT token (Settings → Clients in the Gotify web UI — " +
    "not an application token, which can only send messages). Sent as `X-Gotify-Key`.",
  connectionLabel: "{{name}} @ {{baseUrl}}",
  fields: [
    {
      key: "baseUrl",
      label: "Instance URL",
      type: "string",
      required: true,
      placeholder: "https://gotify.example.com",
      hint: "Your Gotify server. A URL without a scheme is assumed to be https.",
    },
    {
      key: "token",
      label: "Client Token",
      type: "secret",
      required: true,
      hint: "From the Gotify web UI: Settings → Clients → Create Client. Must be a CLIENT " +
        "token, not an application token — an application token can only send messages and " +
        "will fail on everything else this app does.",
    },
  ],

  sign({ request, credential }) {
    const { token } = credential as { token: string };
    request.headers["x-gotify-key"] = token;
    return request;
  },

  /**
   * `GET /current/user` is the narrowest call that both proves the token
   * works AND that it is a client token — an application token has no access
   * to it at all and gets the same 401 a bad token would, which is exactly
   * the distinction worth catching at connect time.
   */
  async test({ credential }, ctx) {
    const { token, baseUrl } = credential as { token?: string; baseUrl?: string };
    if (!token) return { ok: false, message: "credential missing token" };
    if (!baseUrl) return { ok: false, message: "credential missing baseUrl" };

    let base: string;
    try {
      base = normalizeBaseUrl(baseUrl);
    } catch (err) {
      return { ok: false, message: String((err as Error).message) };
    }

    const res = await ctx.fetch(`${base}${API_PATH}/current/user`, {
      headers: { "x-gotify-key": token, accept: "application/json" },
    });
    if (res.status === 401) {
      return {
        ok: false,
        message: "Gotify rejected the token (401) — check it is a CLIENT token, not an " +
          "application token, and that it has not been deleted",
      };
    }
    if (res.status === 403) {
      return { ok: false, message: "the token is valid but forbidden from this endpoint (403)" };
    }
    if (res.status === 404) {
      return {
        ok: false,
        message: `no Gotify API at ${base} (404) — check the instance URL`,
      };
    }
    if (!res.ok) {
      const body = await res.json().catch(() => null) as GotifyErrorBody | null;
      return { ok: false, message: body?.errorDescription ?? `Gotify returned ${res.status}` };
    }
    return { ok: true };
  },

  /** Records the instance and the account. Never the token. */
  async afterConnect(input, ctx) {
    const { credential } = input as { credential: { token?: string; baseUrl?: string } };
    const display: Record<string, unknown> = {
      baseUrl: credential.baseUrl ? normalizeBaseUrl(credential.baseUrl) : undefined,
    };
    if (!credential.token || !display.baseUrl) return display;

    try {
      const res = await ctx.fetch(`${display.baseUrl}${API_PATH}/current/user`, {
        headers: { "x-gotify-key": credential.token, accept: "application/json" },
      });
      if (!res.ok) return display;
      const body = await res.json() as { name?: string; admin?: boolean };
      display.name = body.name;
      display.admin = body.admin;
      return display;
    } catch {
      return display;
    }
  },
};

export default token;

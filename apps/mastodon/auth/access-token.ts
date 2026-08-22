import type { AuthDefinition } from "@w6w/types";
import { describeError, normalizeUrl } from "../lib/client.ts";

/**
 * A Mastodon access token, issued by one instance.
 *
 * ## Why this is a token and not OAuth
 *
 * There is no central Mastodon, so there is no central OAuth client. Registering
 * an application means `POST /api/v1/apps` **on the instance in question** —
 * verified live, it works unauthenticated — and the `client_id` it returns is
 * valid on that server and nowhere else. A single OAuth configuration for
 * "Mastodon" therefore cannot exist.
 *
 * What every instance does offer is a personal access token: Preferences →
 * Development → New application. Pick the scopes, save, and the token is on the
 * application's own page.
 *
 * ## Scopes are chosen at creation and cannot be widened
 *
 * `read`, `write`, `follow`, and their finer-grained forms (`write:statuses`,
 * `read:notifications`). A token missing one returns 403 on that endpoint and
 * works everywhere else — and the only fix is a new application, because the
 * scopes of an existing one cannot be changed.
 *
 * `read write:statuses` covers most of what this app does; add `write:follows`
 * for the follow actions and `write:media` for uploads.
 *
 * ## The token belongs to the instance, not to you
 *
 * Moving a connection to a different server means a new token. A token from
 * `mastodon.social` presented to `hachyderm.io` is simply invalid, and the 401
 * says nothing about why.
 */
const accessToken: AuthDefinition = {
  key: "access-token",
  type: "bearer",
  displayName: "Access Token",
  description:
    "A personal access token from one instance. Mastodon has no central OAuth client — an " +
    "application is registered per server, so a token is meaningless on any other.",
  connectionLabel: "{{acct}}",
  fields: [
    {
      key: "url",
      label: "Instance",
      type: "string",
      required: true,
      default: "",
      placeholder: "https://mastodon.social",
      hint: "The server your account is on. Pasting `@you@example.social` works too — the " +
        "domain is taken from it.",
    },
    {
      key: "token",
      label: "Access Token",
      type: "secret",
      required: true,
      hint: "Preferences → Development → New application. Choose the scopes there: `read " +
        "write:statuses` covers most of this app, plus `write:follows` and `write:media` if you " +
        "need them. Scopes cannot be widened afterwards.",
    },
  ],

  sign({ request, credential }) {
    const { token } = credential as { token: string };
    request.headers["authorization"] = `Bearer ${token}`;
    return request;
  },

  /**
   * `GET /api/v1/accounts/verify_credentials` — the smallest call that proves
   * the token and reports whose it is.
   */
  async test({ credential }, ctx) {
    const { url, token } = credential as { url?: string; token?: string };
    if (!url) return { ok: false, message: "credential missing the instance URL" };
    if (!token) return { ok: false, message: "credential missing the access token" };

    let base: string;
    try {
      base = normalizeUrl(url);
    } catch (err) {
      return { ok: false, message: String(err) };
    }

    let res: Response;
    try {
      res = await ctx.fetch(`${base}/api/v1/accounts/verify_credentials`, {
        headers: { authorization: `Bearer ${token}`, accept: "application/json" },
      });
    } catch (err) {
      return { ok: false, message: `could not reach ${base}: ${String(err)}` };
    }
    const text = await res.text().catch(() => "");
    if (!res.ok) {
      return {
        ok: false,
        message: `${describeError(res.status, text)}. Check the instance is the one that issued ` +
          "this token — a token from another server fails exactly like a wrong one",
      };
    }

    interface Account {
      acct?: string;
      username?: string;
    }
    let account: Account | null = null;
    try {
      account = JSON.parse(text) as Account;
    } catch {
      return {
        ok: false,
        message: `${base} did not return JSON — this is usually a proxy or a landing page rather ` +
          "than a Mastodon instance",
      };
    }

    const host = new URL(base).hostname;
    return {
      ok: true,
      message: `connected as @${account?.username ?? "unknown"}@${host}`,
    };
  },

  /**
   * Record the instance's own limits, because they are per-server and every
   * post has to be checked against them.
   */
  async afterConnect({ credential }, ctx) {
    const { url, token } = credential as { url?: string; token?: string };
    if (!url || !token) return {};
    let base: string;
    try {
      base = normalizeUrl(url);
    } catch {
      return {};
    }
    const host = new URL(base).hostname;

    let acct: string | undefined;
    try {
      const res = await ctx.fetch(`${base}/api/v1/accounts/verify_credentials`, {
        headers: { authorization: `Bearer ${token}`, accept: "application/json" },
      });
      if (res.ok) {
        const account = await res.json().catch(() => null) as { username?: string } | null;
        acct = account?.username ? `@${account.username}@${host}` : undefined;
      } else {
        await res.body?.cancel();
      }
    } catch { /* the label is a nicety; the limits below are not */ }

    let maxCharacters: number | undefined;
    let maxMedia: number | undefined;
    let version: string | undefined;
    try {
      // Unauthenticated, and the source of truth for this server's limits.
      const res = await ctx.fetch(`${base}/api/v2/instance`, {
        headers: { accept: "application/json" },
      });
      if (res.ok) {
        const instance = await res.json().catch(() => null) as {
          version?: string;
          configuration?: {
            statuses?: { max_characters?: number; max_media_attachments?: number };
          };
        } | null;
        version = instance?.version;
        maxCharacters = instance?.configuration?.statuses?.max_characters;
        maxMedia = instance?.configuration?.statuses?.max_media_attachments;
      } else {
        await res.body?.cancel();
      }
    } catch { /* the defaults in lib/client.ts stand in */ }

    return { url: base, acct: acct ?? host, maxCharacters, maxMedia, version };
  },
};

export default accessToken;

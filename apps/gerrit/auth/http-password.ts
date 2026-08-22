import type { AuthDefinition } from "@w6w/types";
import { describeError, normalizeHost, stripMagicPrefix } from "../lib/client.ts";

/**
 * A Gerrit **HTTP password** — basic auth against the `/a/` path.
 *
 * ## It is not the account's login password
 *
 * Gerrit generates a separate credential under Settings → HTTP Credentials.
 * On a Gerrit behind an SSO provider the login password may not exist at all,
 * and the HTTP password is the only way in for a program. A 401 does not say
 * which was tried, and its body is usually HTML.
 *
 * ## The username is the Gerrit username, not the email
 *
 * A Gerrit account can have several email addresses and one username. Basic
 * auth takes the username, and using an email produces the same 401.
 *
 * ## `/a/` is what makes a failure a failure
 *
 * Gerrit serves anonymous reads at the bare path. A client that omits `/a/`
 * and has a broken credential does not get an error — it gets whatever the
 * instance shows the public, which on an open-source Gerrit is most of it.
 * This app always uses `/a/`, so this test proves the credential rather than
 * the server.
 */
const auth: AuthDefinition = {
  key: "http-password",
  type: "basic",
  displayName: "HTTP password",
  connectionLabel: "{{username}} at {{hostLabel}}",
  description:
    "Gerrit's generated HTTP password, from Settings → HTTP Credentials — NOT the login " +
    "password, and the username is the Gerrit username rather than an email. Probed under " +
    "`/a/`, because the bare path serves anonymous reads and would hide a broken credential.",
  fields: [
    {
      key: "host",
      label: "Host",
      type: "string",
      required: true,
      placeholder: "https://gerrit.example.com",
      hint: "The Gerrit base URL, with no `/a` on the end. Gerrit is software people run, so " +
        "every instance is its own host.",
    },
    {
      key: "username",
      label: "Username",
      type: "string",
      required: true,
      hint: "The Gerrit username, from Settings → Profile. An email address will not work.",
    },
    {
      key: "httpPassword",
      label: "HTTP password",
      type: "secret",
      required: true,
      hint: "Settings → HTTP Credentials → Generate. Different from the account's login " +
        "password, and on an SSO-backed Gerrit it is the only credential a program can use.",
    },
  ],

  sign({ request, credential }) {
    const fields = credential as Record<string, unknown>;
    const encoded = btoa(`${String(fields?.username ?? "")}:${String(fields?.httpPassword ?? "")}`);
    return {
      ...request,
      headers: { ...request.headers, authorization: `Basic ${encoded}` },
    };
  },

  exchange({ fields }) {
    const values = fields as Record<string, unknown>;
    const host = normalizeHost(values?.host);
    const username = String(values?.username ?? "").trim();
    const httpPassword = String(values?.httpPassword ?? "").trim();
    if (!username || !httpPassword) {
      throw new Error("`username` and `httpPassword` are both required");
    }
    return { host, username, httpPassword };
  },

  async test({ credential }, ctx) {
    const fields = credential as Record<string, unknown>;
    const host = String(fields?.host ?? "");

    let res: Response;
    try {
      // `/a/accounts/self` needs the credential; the bare path would not.
      res = await ctx.fetch(`${host}/a/accounts/self`, {
        headers: { accept: "application/json" },
      });
    } catch (err) {
      return { ok: false, message: `could not reach ${host}: ${String(err)}` };
    }
    const raw = await res.text().catch(() => "");
    if (!res.ok) return { ok: false, message: describeError(res.status, raw) };

    interface Account {
      _account_id?: number;
      name?: string;
      username?: string;
      email?: string;
      inactive?: boolean;
    }
    let account: Account = {};
    try {
      account = JSON.parse(stripMagicPrefix(raw)) as Account;
    } catch { /* an unexpected shape is still an authenticated call */ }

    if (account.inactive) {
      return {
        ok: false,
        message: `${account.username ?? "this account"} is INACTIVE in Gerrit — the ` +
          "credential is valid and the account cannot do anything",
      };
    }

    return {
      ok: true,
      message: `authenticated as ${account.name ?? account.username ?? "an unnamed account"} ` +
        `(id ${account._account_id ?? "?"}). Gerrit's permissions are per project and per ref, ` +
        "so what this can do varies by repository",
    };
  },

  async afterConnect({ credential }, ctx) {
    const fields = credential as Record<string, unknown>;
    const host = String(fields?.host ?? "");

    let version = "";
    try {
      // Unauthenticated, and it carries the version.
      const res = await ctx.fetch(`${host}/config/server/version`, {
        headers: { accept: "application/json" },
      });
      if (res.ok) {
        version = JSON.parse(stripMagicPrefix(await res.text())) as string;
      }
    } catch { /* the label is a convenience, not a gate */ }

    return {
      host,
      hostLabel: host ? new URL(host).host : "",
      username: String(fields?.username ?? ""),
      version,
    };
  },
};

export default auth;

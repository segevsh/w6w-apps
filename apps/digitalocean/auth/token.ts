import type { AuthDefinition } from "@w6w/types";
import { API_HOST, describeError } from "../lib/client.ts";

/**
 * A DigitalOcean personal access token.
 *
 * ## Read-only tokens fail late, and look identical until they do
 *
 * A token can be issued read-only or read-write. A read-only one authenticates
 * perfectly, succeeds on every list and every get, and fails with **403** on
 * the first thing that changes anything — which in a workflow is usually
 * halfway through, after several steps have already run.
 *
 * Nothing at connect time distinguishes them: `GET /v2/account` works for both.
 * So this records what it can and the 403 at least has an explanation attached.
 *
 * ## The token is the whole account
 *
 * There is no per-project or per-resource scoping on a personal access token.
 * Whoever holds a read-write one can destroy every droplet, every volume and
 * every database in the account. DigitalOcean's narrower mechanism is a team
 * with its own membership rather than a scoped token.
 *
 * ## Tokens can expire, and 30 days is now the default in the console
 *
 * A token created through the control panel gets an expiry unless one is
 * chosen otherwise, so an integration built today can stop in a month with a
 * 401 that says only that it could not authenticate.
 */
interface TokenCredential {
  token: string;
}

const token: AuthDefinition = {
  key: "token",
  type: "bearer",
  displayName: "Personal Access Token",
  description: "A DigitalOcean personal access token. It carries the WHOLE account — there is no " +
    "per-resource scoping — and a READ-ONLY token is indistinguishable from a read-write one " +
    "until the first change fails with a 403.",
  connectionLabel: "{{email}}",
  fields: [
    {
      key: "token",
      label: "Access Token",
      type: "secret",
      required: true,
      hint: "API → Tokens in the control panel. Issue it READ-ONLY unless the workflow needs to " +
        "change things — a read-write token can destroy every resource in the account.",
    },
  ],

  sign({ request, credential }) {
    const { token } = credential as TokenCredential;
    request.headers["authorization"] = `Bearer ${token}`;
    return request;
  },

  /** `GET /v2/account` — the smallest call that proves the token. */
  async test({ credential }, ctx) {
    const cred = credential as Partial<TokenCredential> | undefined;
    if (!cred?.token) return { ok: false, message: "credential missing the access token" };

    let res: Response;
    try {
      res = await ctx.fetch(`${API_HOST}/v2/account`, {
        headers: { authorization: `Bearer ${cred.token}`, accept: "application/json" },
      });
    } catch (err) {
      return { ok: false, message: `could not reach DigitalOcean: ${String(err)}` };
    }
    const text = await res.text().catch(() => "");
    if (!res.ok) return { ok: false, message: describeError(res.status, text) };

    interface AccountBody {
      account?: { email?: string; status?: string; droplet_limit?: number };
    }
    let body: AccountBody | null = null;
    try {
      body = JSON.parse(text) as AccountBody;
    } catch {
      return { ok: false, message: "DigitalOcean did not return JSON" };
    }

    const account = body?.account;
    if (account?.status && account.status !== "active") {
      // A locked account authenticates and refuses everything else.
      return {
        ok: false,
        message: `this account's status is \`${account.status}\` rather than active — the token ` +
          "works and every operation on resources will be refused until the account is",
      };
    }
    return {
      ok: true,
      message: `connected as ${account?.email ?? "a DigitalOcean account"}` +
        " — this test cannot tell a read-only token from a read-write one, because listing " +
        "works for both",
    };
  },

  /** Record the account, so a 403 later has something attached to it. */
  async afterConnect({ credential }, ctx) {
    const cred = credential as Partial<TokenCredential>;
    if (!cred?.token) return {};
    try {
      const res = await ctx.fetch(`${API_HOST}/v2/account`, {
        headers: { authorization: `Bearer ${cred.token}`, accept: "application/json" },
      });
      if (!res.ok) {
        await res.body?.cancel();
        return {};
      }
      const body = await res.json().catch(() => null) as
        | { account?: { email?: string; uuid?: string; droplet_limit?: number } }
        | null;
      return {
        email: body?.account?.email,
        accountId: body?.account?.uuid,
        dropletLimit: body?.account?.droplet_limit,
      };
    } catch {
      return {};
    }
  },
};

export default token;

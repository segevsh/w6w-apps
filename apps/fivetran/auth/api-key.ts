import type { AuthDefinition } from "@w6w/types";
import { API_VERSION, BASE_URL } from "../lib/client.ts";

/**
 * A Fivetran API key and secret, sent as HTTP Basic — the key as the username
 * and the secret as the password.
 *
 * ## Three kinds of key, reaching different things
 *
 * Fivetran issues **scoped keys** tied to a person (and carrying that person's
 * access, which disappears when they leave), **service account keys** for
 * programmatic use, and org-level **system keys**. They authenticate
 * identically, so a workflow can be built on a key that quietly stops working
 * the day somebody changes team.
 *
 * A service account key is the right choice here, for the same reason it is
 * everywhere else.
 *
 * ## The account's plan changes the rate limit by forty times
 *
 * A **trial** account is capped at 500 requests an hour; a paid one at 20,000.
 * Nothing about a request says which you are on, and a workflow built
 * comfortably on a paid account will not survive being pointed at a trial. The
 * connection test reports it.
 */
const apiKey: AuthDefinition = {
  key: "api-key",
  type: "basic",
  displayName: "API Key",
  description:
    "A Fivetran API key and secret, sent as Basic auth. Prefer a service account key — a scoped " +
    "key carries one person's access and stops working when they change team.",
  connectionLabel: "Fivetran ({{account}})",
  fields: [
    {
      key: "apiKey",
      label: "API Key",
      type: "secret",
      required: true,
      row: "credential",
      hint: "Fivetran → Account Settings → API Config. A service account key survives the person " +
        "who created it.",
    },
    {
      key: "apiSecret",
      label: "API Secret",
      type: "secret",
      required: true,
      row: "credential",
      hint: "Shown once when the key is created.",
    },
  ],

  sign({ request, credential }) {
    const { apiKey, apiSecret } = credential as { apiKey: string; apiSecret: string };
    request.headers["authorization"] = `Basic ${btoa(`${apiKey}:${apiSecret}`)}`;
    // Fivetran answers 406 for an Accept header it does not recognise, so the
    // version is pinned on every request rather than left to a default.
    request.headers["accept"] = API_VERSION;
    return request;
  },

  /**
   * `GET /v1/account/info` — the cheapest call that proves the credential
   * works, and the only one that names the account and its plan.
   *
   * The plan matters operationally: it is the difference between 500 and 20,000
   * requests an hour.
   */
  async test({ credential }, ctx) {
    const { apiKey, apiSecret } = credential as { apiKey?: string; apiSecret?: string };
    if (!apiKey || !apiSecret) {
      return { ok: false, message: "credential missing the API key or secret" };
    }

    let res: Response;
    try {
      res = await ctx.fetch(`${BASE_URL}/v1/account/info`, {
        headers: {
          authorization: `Basic ${btoa(`${apiKey}:${apiSecret}`)}`,
          accept: API_VERSION,
        },
      });
    } catch (err) {
      return { ok: false, message: `could not reach Fivetran: ${String(err)}` };
    }

    if (res.status === 401 || res.status === 403) {
      await res.body?.cancel();
      return { ok: false, message: "Fivetran rejected this API key and secret" };
    }
    if (res.status === 406) {
      await res.body?.cancel();
      // Should be impossible here, but it is the one failure whose message is
      // otherwise baffling.
      return { ok: false, message: "Fivetran refused the Accept header version" };
    }
    if (!res.ok) {
      await res.body?.cancel();
      return { ok: false, message: `Fivetran returned ${res.status}` };
    }

    const body = await res.json().catch(() => null) as
      | { data?: { name?: string; account_type?: string; country?: string } }
      | null;
    const data = body?.data ?? {};
    const name = data.name ?? "this account";
    const plan = String(data.account_type ?? "").toLowerCase();

    return {
      ok: true,
      message: plan.includes("trial")
        ? `connected to ${name} — a TRIAL account, capped at 500 API requests an hour rather ` +
          "than 20,000"
        : `connected to ${name}${data.account_type ? ` (${data.account_type})` : ""}`,
    };
  },

  /** Records the account and its plan. Never the credentials. */
  async afterConnect({ credential }, ctx) {
    const { apiKey, apiSecret } = credential as { apiKey: string; apiSecret: string };
    try {
      const res = await ctx.fetch(`${BASE_URL}/v1/account/info`, {
        headers: {
          authorization: `Basic ${btoa(`${apiKey}:${apiSecret}`)}`,
          accept: API_VERSION,
        },
      });
      if (!res.ok) {
        await res.body?.cancel();
        return {};
      }
      const body = await res.json().catch(() => null) as
        | { data?: { name?: string; account_type?: string } }
        | null;
      return {
        account: body?.data?.name,
        accountType: body?.data?.account_type,
      };
    } catch {
      return {};
    }
  },
};

export default apiKey;

import type { AuthDefinition } from "@w6w/types";
import { describeErrors, endpointFor, type GraphQLResponse } from "../lib/client.ts";

/**
 * A New Relic **User key**.
 *
 * ## Three credentials, one error message
 *
 * New Relic issues several kinds of key and only one works here:
 *
 * - **User key** (`NRAK-…`) — reads and writes through NerdGraph. This one.
 * - **License key** / **Ingest key** — sends telemetry *in*. Cannot query.
 * - **Browser key** — for the browser agent.
 *
 * A License key against NerdGraph returns `authentication required`, which is
 * the same message a wrong User key returns, and the same message a *correct*
 * key returns when it is pointed at the wrong region. Verified live on
 * 2026-08-18. The connection test therefore checks the key's shape before
 * spending a request, and its failure message names all three possibilities
 * rather than asserting the key is bad.
 *
 * ## The region is part of the credential in practice
 *
 * An account lives in either the US or the EU data centre, and they are
 * separate endpoints holding separate data. Getting it wrong looks exactly like
 * a bad key. There is no way to detect the region from the key itself, so it is
 * a field — and the test, on failing, suggests trying the other one.
 *
 * ## The account id is not in the key
 *
 * A user key can see every account the user belongs to, and nearly every
 * NerdGraph query needs an account id. `afterConnect` records the first one so
 * workflows need not repeat it, and every action can override.
 */
const userKey: AuthDefinition = {
  key: "user-key",
  type: "apiKey",
  displayName: "User Key",
  description:
    "A New Relic USER key (`NRAK-…`) — not a License or Ingest key, which send data in and " +
    "cannot query. The region is part of it in practice: US and EU are separate endpoints.",
  connectionLabel: "{{userName}} ({{region}})",
  apiKey: { in: "header", name: "API-Key" },
  fields: [
    {
      key: "apiKey",
      label: "User Key",
      type: "secret",
      required: true,
      placeholder: "NRAK-XXXXXXXXXXXXXXXXXXXXXXXXXXX",
      hint: "one.newrelic.com → API keys → Create a key → **User**. A License or Ingest key is " +
        "for sending telemetry and is rejected here with a message that looks like a bad key.",
    },
    {
      key: "region",
      label: "Region",
      type: "select",
      required: true,
      default: "US",
      options: [
        { value: "US", label: "US — api.newrelic.com" },
        { value: "EU", label: "EU — api.eu.newrelic.com" },
      ],
      hint: "Whichever data centre the account lives in. The wrong one fails with " +
        "`authentication required`, exactly as a wrong key does.",
    },
    {
      key: "accountId",
      label: "Default Account",
      type: "string",
      default: "",
      hint: "Optional. A user key can see several accounts and most queries need one — recording " +
        "a default here saves repeating it. Left blank, it is taken from the first account the " +
        "key can see.",
    },
  ],

  sign({ request, credential }) {
    const { apiKey } = credential as { apiKey: string };
    // Its own header, not Authorization.
    request.headers["api-key"] = apiKey;
    return request;
  },

  /**
   * `{ actor { user { name email } } }` — the smallest query that proves the
   * key, and it needs no account id.
   */
  async test({ credential }, ctx) {
    const { apiKey, region } = credential as { apiKey?: string; region?: string };
    if (!apiKey) return { ok: false, message: "credential missing the user key" };

    // Cheap, and it catches the most common mistake before spending a request.
    if (!/^NRAK-/i.test(apiKey)) {
      return {
        ok: false,
        message: "this does not look like a User key — those begin `NRAK-`. A License or Ingest " +
          "key sends telemetry in and cannot query NerdGraph",
      };
    }

    let endpoint: string;
    try {
      endpoint = endpointFor(region);
    } catch (err) {
      return { ok: false, message: String(err) };
    }

    let res: Response;
    try {
      res = await ctx.fetch(endpoint, {
        method: "POST",
        headers: {
          "api-key": apiKey,
          "content-type": "application/json",
          accept: "application/json",
        },
        body: JSON.stringify({ query: "{ actor { user { name email } } }" }),
      });
    } catch (err) {
      return { ok: false, message: `could not reach ${endpoint}: ${String(err)}` };
    }
    const text = await res.text().catch(() => "");

    type TestData = { actor?: { user?: { name?: string; email?: string } } };
    let body: GraphQLResponse<TestData> | null = null;
    try {
      body = JSON.parse(text) as GraphQLResponse<TestData>;
    } catch {
      return { ok: false, message: `New Relic returned ${res.status} and not JSON` };
    }

    if (!res.ok || body?.errors?.length) {
      const detail = body?.errors?.length
        ? describeErrors(body.errors, false)
        : `HTTP ${res.status}`;
      const other = String(region ?? "US").toUpperCase() === "EU" ? "US" : "EU";
      return {
        ok: false,
        message: `${detail}. If the key is definitely right, try the ${other} region — an ` +
          "account in the other data centre fails with exactly this message",
      };
    }

    const user = body?.data?.actor?.user;
    return {
      ok: true,
      message: `connected as ${user?.name ?? "a user"} in the ${
        String(region ?? "US").toUpperCase()
      } region`,
    };
  },

  /**
   * Record the user and an account id, because nearly every query needs one and
   * the key does not carry it.
   */
  async afterConnect({ credential }, ctx) {
    const { apiKey, region, accountId } = credential as {
      apiKey?: string;
      region?: string;
      accountId?: string;
    };
    if (!apiKey) return {};
    let endpoint: string;
    try {
      endpoint = endpointFor(region);
    } catch {
      return {};
    }

    let res: Response;
    try {
      res = await ctx.fetch(endpoint, {
        method: "POST",
        headers: {
          "api-key": apiKey,
          "content-type": "application/json",
          accept: "application/json",
        },
        body: JSON.stringify({
          query: "{ actor { user { name } accounts { id name } } }",
        }),
      });
    } catch {
      return { region: String(region ?? "US").toUpperCase() };
    }
    if (!res.ok) {
      await res.body?.cancel();
      return { region: String(region ?? "US").toUpperCase() };
    }

    const body = await res.json().catch(() => null) as
      | GraphQLResponse<{
        actor?: {
          user?: { name?: string };
          accounts?: Array<{ id?: number; name?: string }>;
        };
      }>
      | null;
    const accounts = body?.data?.actor?.accounts ?? [];
    const chosen = Number(accountId ?? NaN);

    return {
      region: String(region ?? "US").toUpperCase(),
      userName: body?.data?.actor?.user?.name,
      // Whatever was typed, else the first the key can see.
      accountId: Number.isFinite(chosen) && chosen > 0 ? chosen : accounts[0]?.id,
      accountCount: accounts.length,
    };
  },
};

export default userKey;

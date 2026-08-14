import { assert, assertEquals } from "@std/assert";
import oauth, {
  AUTHORIZATION_URL,
  BASECAMP_PRODUCT,
  basecampAccounts,
  bearerFrom,
  PROBE_URL,
  TOKEN_URL,
} from "../../auth/oauth.ts";
import { USER_AGENT } from "../../lib/client.ts";
import { identity, LAUNCHPAD, mockCtx, TOKEN } from "../_helpers.ts";

interface SignableRequest {
  url: string;
  headers: Record<string, string>;
}

/** `sign` is network-less, so the ctx it is handed makes no requests. */
function signWith(request: SignableRequest, credential: Record<string, unknown>) {
  return oauth.sign!({ request, credential } as never, mockCtx([]).ctx) as SignableRequest;
}

const BC = (over: Record<string, unknown> = {}) => ({
  id: 999999999,
  product: BASECAMP_PRODUCT,
  name: "Acme",
  ...over,
});

/** Basecamp has no API keys — OAuth against 37signals' Launchpad is the only way in. */
Deno.test("auth: is oauth2 against Launchpad, with no scopes to request", () => {
  assertEquals(oauth.key, "oauth");
  assertEquals(oauth.type, "oauth2");
  assertEquals(oauth.oauth2?.authorizationUrl, `${LAUNCHPAD}/authorization/new`);
  assertEquals(oauth.oauth2?.tokenUrl, `${LAUNCHPAD}/authorization/token`);
  assertEquals(oauth.oauth2?.scopes, []);
  assertEquals(AUTHORIZATION_URL, `${LAUNCHPAD}/authorization/new`);
  assertEquals(TOKEN_URL, `${LAUNCHPAD}/authorization/token`);
  assertEquals(PROBE_URL, `${LAUNCHPAD}/authorization.json`);
});

/** The label comes from the account the authorization resolved to, not from a typed field. */
Deno.test("auth: labels the connection with the discovered account name", () => {
  assertEquals(oauth.connectionLabel, "{{account.name}}");
});

/** Hosts differ on the casing they store the token under; both have to work. */
Deno.test("bearerFrom: accepts either camelCase or snake_case storage", () => {
  assertEquals(bearerFrom({ accessToken: TOKEN }), TOKEN);
  assertEquals(bearerFrom({ access_token: TOKEN }), TOKEN);
  assertEquals(bearerFrom({}), "");
});

Deno.test("sign: sends the bearer and Basecamp's required User-Agent", () => {
  const signed = signWith({ url: `${LAUNCHPAD}/x`, headers: {} }, { accessToken: TOKEN });
  assertEquals(signed.headers["authorization"], `Bearer ${TOKEN}`);
  // Basecamp may refuse a request that does not identify the application.
  assertEquals(signed.headers["user-agent"], USER_AGENT);
});

Deno.test("sign: leaves the URL untouched", () => {
  const url = "https://3.basecampapi.com/1/projects.json";
  assertEquals(signWith({ url, headers: {} }, { access_token: TOKEN }).url, url);
});

/**
 * A 37signals ID can hold Highrise or Backpack accounts and no Basecamp 5 one.
 * `bc3` is Basecamp 5's product code, and filtering on it is what stops the app
 * from connecting to an account whose API it cannot speak.
 */
Deno.test("basecampAccounts: keeps only bc3 accounts that carry an id", () => {
  const accounts = basecampAccounts({
    accounts: [
      BC(),
      { id: 2, product: "bc2", name: "Old" },
      { id: 3, product: "highrise", name: "CRM" },
      { product: BASECAMP_PRODUCT, name: "No id" },
    ],
  } as never);
  assertEquals(accounts.map((a) => a.id), [999999999]);
});

Deno.test("basecampAccounts: an absent or empty list is empty, not a throw", () => {
  assertEquals(basecampAccounts(null), []);
  assertEquals(basecampAccounts({} as never), []);
  assertEquals(basecampAccounts({ accounts: [] } as never), []);
});

Deno.test("test: probes Launchpad's identity endpoint with the bearer", async () => {
  const { ctx, calls } = mockCtx([{ body: identity([BC()]) }]);
  const result = await oauth.test!({ credential: { accessToken: TOKEN } } as never, ctx);

  assertEquals(result, { ok: true });
  assertEquals(calls[0].url, PROBE_URL);
  assertEquals(calls[0].headers["authorization"], `Bearer ${TOKEN}`);
  assertEquals(calls[0].headers["user-agent"], USER_AGENT);
});

Deno.test("test: reports a missing token without making a request", async () => {
  const { ctx, calls } = mockCtx([]);
  const result = await oauth.test!({ credential: {} } as never, ctx);
  assertEquals(result.ok, false);
  assert(result.message!.includes("missing access token"), result.message);
  assertEquals(calls.length, 0);
});

/**
 * Basecamp's access tokens expire, so a 401 here is routine and the fix is to
 * reconnect — the message says so rather than leaving "rejected" to be decoded.
 */
Deno.test("test: a 401 says the token expires and to reconnect", async () => {
  for (const status of [401, 403]) {
    const { ctx } = mockCtx([{ status, body: { error: "nope" } }]);
    const result = await oauth.test!({ credential: { accessToken: TOKEN } } as never, ctx);
    assertEquals(result.ok, false);
    assert(result.message!.includes(`(${status})`), result.message);
    assert(result.message!.includes("reconnect"), result.message);
  }
});

Deno.test("test: any other non-2xx reports the status", async () => {
  const { ctx } = mockCtx([{ status: 500, body: "" }]);
  const result = await oauth.test!({ credential: { accessToken: TOKEN } } as never, ctx);
  assertEquals(result.ok, false);
  assert(result.message!.includes("500"), result.message);
});

Deno.test("test: a 200 that carries no identity is rejected", async () => {
  const { ctx } = mockCtx([{ body: { accounts: [BC()] } }]);
  const result = await oauth.test!({ credential: { accessToken: TOKEN } } as never, ctx);
  assertEquals(result.ok, false);
  assert(result.message!.includes("no identity"), result.message);
});

/**
 * The most useful failure in practice: the login worked, but this 37signals ID
 * simply has no Basecamp 5 account. Naming the products it *can* reach is what
 * turns "it failed" into "you signed in with the wrong account".
 */
Deno.test("test: no bc3 account names the products the ID can reach", async () => {
  const { ctx } = mockCtx([{
    body: identity([
      { id: 2, product: "highrise", name: "CRM" },
      { id: 3, product: "highrise", name: "CRM 2" },
    ] as never),
  }]);
  const result = await oauth.test!({ credential: { accessToken: TOKEN } } as never, ctx);
  assertEquals(result.ok, false);
  assert(result.message!.includes("no Basecamp 5 account"), result.message);
  assert(result.message!.includes("it can reach highrise"), result.message);
  // Deduped: two Highrise accounts must not read as "highrise, highrise".
  assertEquals(result.message!.match(/highrise/g)?.length, 1, result.message);
});

Deno.test("test: an ID with no accounts at all says so plainly", async () => {
  const { ctx } = mockCtx([{ body: identity([]) }]);
  const result = await oauth.test!({ credential: { accessToken: TOKEN } } as never, ctx);
  assertEquals(result.ok, false);
  assertEquals(result.message, "This 37signals ID has no Basecamp 5 account.");
});

/**
 * The account id is what every Basecamp URL embeds, and it is not derivable from
 * the token — this is where it gets published onto the Connection.
 */
Deno.test("afterConnect: publishes the account id the client will need", async () => {
  const { ctx } = mockCtx([{ body: identity([BC()]) }]);
  const display = await oauth.afterConnect!(
    { credential: { accessToken: TOKEN } } as never,
    ctx,
  ) as Record<string, unknown>;
  assertEquals(display.accountId, 999999999);
  assertEquals(display.account, { id: 999999999, name: "Acme" });
  // One account: no list to disambiguate.
  assertEquals(display.accounts, undefined);
});

/** With several Basecamp accounts the first is chosen, and the rest are recorded. */
Deno.test("afterConnect: records every account when there is more than one", async () => {
  const { ctx } = mockCtx([{
    body: identity([BC(), BC({ id: 111, name: "Beta" })]),
  }]);
  const display = await oauth.afterConnect!(
    { credential: { accessToken: TOKEN } } as never,
    ctx,
  ) as Record<string, unknown>;
  assertEquals(display.accountId, 999999999);
  assertEquals(display.accounts, [
    { id: 999999999, name: "Acme" },
    { id: 111, name: "Beta" },
  ]);
});

Deno.test("afterConnect: never republishes the token", async () => {
  const { ctx } = mockCtx([{ body: identity([BC()]) }]);
  const display = await oauth.afterConnect!({ credential: { accessToken: TOKEN } } as never, ctx);
  assert(!JSON.stringify(display).includes(TOKEN));
});

/** A failed lookup must not block the connection — it just publishes nothing. */
Deno.test("afterConnect: a failure, or no bc3 account, yields empty metadata", async () => {
  for (
    const response of [
      { status: 401, body: {} },
      { body: identity([{ id: 2, product: "highrise", name: "CRM" }] as never) },
    ]
  ) {
    const { ctx } = mockCtx([response]);
    assertEquals(
      await oauth.afterConnect!({ credential: { accessToken: TOKEN } } as never, ctx),
      {},
    );
  }
});

Deno.test("afterConnect: a missing token makes no request", async () => {
  const { ctx, calls } = mockCtx([]);
  assertEquals(await oauth.afterConnect!({ credential: {} } as never, ctx), {});
  assertEquals(calls.length, 0);
});

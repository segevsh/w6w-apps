import { assert, assertEquals, assertThrows } from "@std/assert";
import {
  API_URL,
  bool,
  compact,
  csv,
  DropboxSignClient,
  json,
  OAUTH_AUTHORIZE_URL,
  OAUTH_TOKEN_URL,
  parseSigners,
  readRateLimit,
} from "../../lib/client.ts";
import { mockCtx } from "../_helpers.ts";

Deno.test("the API base is what the official spec's servers block states", () => {
  assertEquals(API_URL, "https://api.hellosign.com/v3");
});

/**
 * The spec places /oauth/token under its own `servers` entry, which resolves to
 * a URL that 404s. Measured, the real endpoints are on app.hellosign.com,
 * outside /v3.
 */
Deno.test("OAuth lives on a different host and outside /v3", () => {
  assertEquals(OAUTH_AUTHORIZE_URL, "https://app.hellosign.com/oauth/authorize");
  assertEquals(OAUTH_TOKEN_URL, "https://app.hellosign.com/oauth/token");
  assert(!OAUTH_TOKEN_URL.includes("/v3"), "the token URL must not carry the API's path version");
  assert(!OAUTH_TOKEN_URL.startsWith(API_URL), "the token URL is not under the API base");
});

Deno.test("compact / csv / json behave as the actions expect", () => {
  assertEquals(compact({ a: 1, b: "", c: null, d: undefined, e: [], f: false }), {
    a: 1,
    f: false,
  });
  assertEquals(csv("a, b ,,c"), ["a", "b", "c"]);
  assertEquals(csv(""), undefined);
  assertEquals(csv(["x", " y "]), ["x", "y"]);
  assertEquals(json('{"a":1}', "x"), { a: 1 });
  assertEquals(json("", "x"), undefined);
  assertThrows(() => json("{oops", "labels"), Error, "`labels` is not valid JSON");
});

/** "false" is a truthy string — the one coercion worth centralising. */
Deno.test('bool never treats the string "false" as true', () => {
  assertEquals(bool("false"), false);
  assertEquals(bool("true"), true);
  assertEquals(bool("1"), true);
  assertEquals(bool(0), false);
  assertEquals(bool(undefined), false);
});

Deno.test("parseSigners requires an address and a name on every signer", () => {
  const ok = parseSigners('[{"email_address":"ada@example.com","name":"Ada"}]', false);
  assertEquals(ok, [{ email_address: "ada@example.com", name: "Ada" }]);

  assertThrows(() => parseSigners("[]", false), Error, "`signers` is required");
  assertThrows(
    () => parseSigners('[{"name":"Ada"}]', false),
    Error,
    "signer 0 has no `email_address`",
  );
  assertThrows(
    () => parseSigners('[{"email_address":"ada@example.com"}]', false),
    Error,
    "signer 0 has no `name`",
  );
});

/** A template matches signers by role; a role-less signer would land wrong. */
Deno.test("parseSigners demands a role only on the template path", () => {
  const signer = '[{"email_address":"ada@example.com","name":"Ada"}]';
  parseSigners(signer, false); // fine without a role
  assertThrows(() => parseSigners(signer, true), Error, "signer 0 has no `role`");
  const withRole = parseSigners(
    '[{"email_address":"ada@example.com","name":"Ada","role":"Client"}]',
    true,
  );
  assertEquals(withRole[0].role, "Client");
});

/** The alias is accepted on the way in and dropped on the way out. */
Deno.test("parseSigners accepts `email` but forwards only `email_address`", () => {
  assertEquals(parseSigners('[{"email":"ada@example.com","name":"Ada"}]', false), [
    { email_address: "ada@example.com", name: "Ada" },
  ]);
});

/**
 * The measured header name is `x-ratelimit-limit-remaining`. The spec declares
 * `X-RateLimit-Remaining`, which is not what the wire sends.
 */
Deno.test("readRateLimit reads the header the wire actually sends", () => {
  const measured = new Headers({
    "x-ratelimit-limit": "100",
    "x-ratelimit-limit-remaining": "97",
    "x-ratelimit-reset": "1787051516",
  });
  assertEquals(readRateLimit(measured), { limit: 100, remaining: 97, reset: 1787051516 });
});

Deno.test("readRateLimit also accepts the spelling the spec declares", () => {
  const spec = new Headers({ "x-ratelimit-limit": "100", "x-ratelimit-remaining": "42" });
  assertEquals(readRateLimit(spec).remaining, 42);
});

Deno.test("readRateLimit reports nothing rather than zero when the headers are absent", () => {
  assertEquals(readRateLimit(new Headers()), {
    limit: undefined,
    remaining: undefined,
    reset: undefined,
  });
});

Deno.test("client: builds paths under the v3 base", async () => {
  const { ctx, calls } = mockCtx([{ status: 200, body: { account: {} } }]);
  await new DropboxSignClient(ctx).request("/account", { query: { account_id: "a1" } });
  assertEquals(calls[0].url, "https://api.hellosign.com/v3/account?account_id=a1");
  assertEquals(calls[0].method, "GET");
});

Deno.test("client: never sends an Authorization header — signing is the host's job", async () => {
  const { ctx, calls } = mockCtx([{ status: 200, body: {} }]);
  await new DropboxSignClient(ctx).request("/account");
  assertEquals(calls[0].headers["authorization"], undefined);
});

Deno.test("client: a failure surfaces the status and Dropbox Sign's error envelope", async () => {
  const { ctx } = mockCtx([{
    status: 401,
    statusText: "Unauthorized",
    body: { error: { error_msg: "Unauthorized api key", error_name: "unauthorized" } },
  }]);
  try {
    await new DropboxSignClient(ctx).request("/account");
    throw new Error("expected a rejection");
  } catch (err) {
    const message = (err as Error).message;
    assert(message.includes("401"), message);
    assert(message.includes("unauthorized"), message);
    assert(message.includes("Unauthorized api key"), message);
  }
});

Deno.test("client: records the rate limit from the last response", async () => {
  const { ctx } = mockCtx([{
    status: 200,
    body: {},
    headers: { "content-type": "application/json", "x-ratelimit-limit-remaining": "7" },
  }]);
  const client = new DropboxSignClient(ctx);
  await client.request("/account");
  assertEquals(client.lastRateLimit.remaining, 7);
});

/** Pages are 1-based: starting at 0 re-fetches page 1 and duplicates it. */
Deno.test("requestAll starts at page 1 and follows num_pages", async () => {
  const { ctx, calls } = mockCtx([
    { status: 200, body: { list_info: { num_pages: 2 }, items: [{ id: "a" }] } },
    { status: 200, body: { list_info: { num_pages: 2 }, items: [{ id: "b" }] } },
  ]);
  const all = await new DropboxSignClient(ctx).requestAll("/x", "items");
  assertEquals(all, [{ id: "a" }, { id: "b" }]);
  assertEquals(new URL(calls[0].url).searchParams.get("page"), "1");
  assertEquals(new URL(calls[1].url).searchParams.get("page"), "2");
});

Deno.test("requestAll stops at the wanted total and asks for no more than that", async () => {
  const { ctx, calls } = mockCtx([
    { status: 200, body: { list_info: { num_pages: 9 }, items: [{ id: "a" }, { id: "b" }] } },
  ]);
  const all = await new DropboxSignClient(ctx).requestAll("/x", "items", {}, 2);
  assertEquals(all.length, 2);
  assertEquals(calls.length, 1);
  assertEquals(new URL(calls[0].url).searchParams.get("page_size"), "2");
});

Deno.test("requestAll caps a page at 100, Dropbox Sign's maximum", async () => {
  const { ctx, calls } = mockCtx([{
    status: 200,
    body: { list_info: { num_pages: 1 }, items: [] },
  }]);
  await new DropboxSignClient(ctx).requestAll("/x", "items", {}, 5000);
  assertEquals(new URL(calls[0].url).searchParams.get("page_size"), "100");
});

Deno.test("requestAll stops on an empty page rather than looping", async () => {
  const { ctx, calls } = mockCtx([
    { status: 200, body: { list_info: { num_pages: 50 }, items: [] } },
  ]);
  assertEquals(await new DropboxSignClient(ctx).requestAll("/x", "items"), []);
  assertEquals(calls.length, 1);
});

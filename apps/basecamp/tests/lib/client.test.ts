import { assert, assertEquals, assertThrows } from "@std/assert";
import {
  accountIdFromConnection,
  BasecampClient,
  compact,
  formatBasecampError,
  toIdList,
  truncate,
  USER_AGENT,
} from "../../lib/client.ts";
import { ACCOUNT_ID, BASE, mockBasecampCtx, mockCtx } from "../_helpers.ts";

/**
 * The account id lives in every URL and comes from Launchpad at connect time,
 * not from the token — one person can belong to several Basecamp accounts. It is
 * read off the redacted Connection, never off the credential.
 */
Deno.test("accountIdFromConnection: reads the id published by afterConnect", () => {
  assertEquals(
    accountIdFromConnection({ display: { accountId: ACCOUNT_ID } } as never),
    ACCOUNT_ID,
  );
  // Launchpad reports it as a number; the URL needs a string either way.
  assertEquals(
    accountIdFromConnection({ display: { accountId: 999999999 } } as never),
    "999999999",
  );
});

/**
 * Without the id there is no URL to build, so this has to fail with an
 * instruction rather than produce a request against `/undefined/…`.
 */
Deno.test("accountIdFromConnection: a connection with no account id says to reconnect", () => {
  for (const display of [undefined, {}, { accountId: "" }, { accountId: null }]) {
    assertThrows(
      () => accountIdFromConnection(display === undefined ? undefined : { display } as never),
      Error,
      "reconnect",
    );
  }
});

Deno.test("compact: drops unset keys but keeps `false` and `0`", () => {
  assertEquals(
    compact({ a: 1, b: undefined, c: null, d: "", e: false, f: 0, g: "x" }),
    { a: 1, e: false, f: 0, g: "x" },
  );
});

Deno.test("toIdList: parses a comma-separated list into numbers", () => {
  assertEquals(toIdList("1,2,3", "ids"), [1, 2, 3]);
  assertEquals(toIdList(" 4 , 5 ", "ids"), [4, 5]);
  assertEquals(toIdList("7", "ids"), [7]);
});

Deno.test("toIdList: an unset or empty value is undefined, not an empty list", () => {
  assertEquals(toIdList(undefined, "ids"), undefined);
  assertEquals(toIdList(null, "ids"), undefined);
  assertEquals(toIdList("", "ids"), undefined);
  assertEquals(toIdList(" , ", "ids"), undefined);
});

/** A silently-dropped bad id would send a request that quietly means something else. */
Deno.test("toIdList: rejects anything that is not a positive integer id", () => {
  assertThrows(() => toIdList("1,abc", "subscriptions"), Error, "subscriptions");
  assertThrows(() => toIdList("0", "ids"), Error, "not an id");
  assertThrows(() => toIdList("-3", "ids"), Error, "not an id");
  assertThrows(() => toIdList("1.5", "ids"), Error, "not an id");
});

Deno.test("truncate: leaves short text alone and marks what it cut", () => {
  assertEquals(truncate("short"), "short");
  const long = "x".repeat(700);
  const cut = truncate(long);
  assert(cut.startsWith("x".repeat(600)), cut.slice(0, 20));
  assert(cut.includes("700 bytes truncated"), cut);
});

/**
 * 429 gets its own sentence because Basecamp's limit — 50 requests per 10
 * seconds per token — really does clear in moments, unlike a daily quota.
 */
Deno.test("formatBasecampError: a 429 names the window and the Retry-After", () => {
  const msg = formatBasecampError(429, "GET", "/todos.json", '{"error":"slow down"}', "7");
  assert(msg.includes("50 requests per 10 seconds"), msg);
  assert(msg.includes("Retry after 7s"), msg);
  assert(msg.includes("slow down"), msg);
});

/**
 * With flat routes the account is in the URL, so a 404 is as often "this
 * connection cannot see it" as "no such id". Saying only "404" would send the
 * reader hunting for the wrong thing.
 */
Deno.test("formatBasecampError: a 404 offers both readings", () => {
  const msg = formatBasecampError(404, "GET", "/todos/1.json", '{"error":"Not Found"}');
  assert(msg.includes("the id may not exist"), msg);
  assert(msg.includes("may not have access"), msg);
});

Deno.test("formatBasecampError: prefers the vendor's own error text", () => {
  assertEquals(
    formatBasecampError(422, "POST", "/todos.json", '{"error":"Content can\'t be blank"}'),
    "Basecamp 422 for POST /todos.json: Content can't be blank",
  );
  assertEquals(
    formatBasecampError(500, "GET", "/todos.json", '{"message":"boom"}'),
    "Basecamp 500 for GET /todos.json: boom",
  );
});

/** An HTML error page is not JSON; the raw body still has to reach the caller. */
Deno.test("formatBasecampError: falls back to the raw body when it is not JSON", () => {
  const msg = formatBasecampError(502, "GET", "/todos.json", "<html>Bad Gateway</html>");
  assert(msg.includes("Bad Gateway"), msg);
});

Deno.test("client: builds every URL under the connection's account id", async () => {
  const { ctx, calls } = mockBasecampCtx([{ body: { id: 1 } }]);
  const client = new BasecampClient(ctx);
  await client.request("/todos/1.json");
  assertEquals(calls[0].url, `${BASE}/todos/1.json`);
  assertEquals(calls[0].method, "GET");
});

/**
 * Basecamp is explicit that a request must identify the application and a way to
 * contact whoever runs it, and may refuse one that does not.
 */
Deno.test("client: sends the User-Agent Basecamp requires, with a contact", async () => {
  const { ctx, calls } = mockBasecampCtx([{ body: {} }]);
  await new BasecampClient(ctx).request("/projects.json");
  assertEquals(calls[0].headers["user-agent"], USER_AGENT);
  assert(USER_AGENT.includes("http"), USER_AGENT);
});

Deno.test("client: drops unset query params and sends no body on a GET", async () => {
  const { ctx, calls } = mockBasecampCtx([{ body: [] }]);
  await new BasecampClient(ctx).request("/projects.json", {
    query: { page: 2, status: undefined, q: "", archived: false },
  });
  const url = new URL(calls[0].url);
  assertEquals(url.searchParams.get("page"), "2");
  assertEquals(url.searchParams.get("archived"), "false");
  assertEquals(url.searchParams.has("status"), false);
  assertEquals(url.searchParams.has("q"), false);
  assertEquals(calls[0].body, null);
  assertEquals(calls[0].headers["content-type"], undefined);
});

Deno.test("client: a body is sent as JSON with the matching content-type", async () => {
  const { ctx, calls } = mockBasecampCtx([{ status: 201, body: { id: 5 } }]);
  const result = await new BasecampClient(ctx).request<{ id: number }>("/todos.json", {
    method: "POST",
    body: { content: "Ship it" },
  });
  assertEquals(calls[0].method, "POST");
  assertEquals(calls[0].headers["content-type"], "application/json");
  assertEquals(JSON.parse(calls[0].body!), { content: "Ship it" });
  assertEquals(result, { id: 5 });
});

/** A delete answers 204 with nothing to parse — that is a success, not a parse error. */
Deno.test("client: 204 and an empty body both resolve to undefined", async () => {
  const { ctx } = mockBasecampCtx([{ status: 204 }, { body: "" }]);
  const client = new BasecampClient(ctx);
  assertEquals(
    await client.request("/recordings/1/status/trashed.json", { method: "PUT" }),
    undefined,
  );
  assertEquals(await client.request("/projects.json"), undefined);
});

Deno.test("client: a failure throws the formatted vendor error", async () => {
  const { ctx } = mockBasecampCtx([
    { status: 404, body: '{"error":"Not Found"}' },
  ]);
  const err = await new BasecampClient(ctx).request("/todos/9.json").catch((e) => e as Error);
  assert(err instanceof Error);
  // The path in the message is the real one, account id and all.
  assert(err.message.includes(`Basecamp 404 for GET /${ACCOUNT_ID}/todos/9.json`), err.message);
  assert(err.message.includes("may not have access"), err.message);
});

/** Credentials belong to `sign`; the client must not add an Authorization header. */
Deno.test("client: sends no Authorization header of its own", async () => {
  const { ctx, calls } = mockBasecampCtx([{ body: {} }]);
  await new BasecampClient(ctx).request("/projects.json");
  assertEquals(calls[0].headers["authorization"], undefined);
});

/** Constructing against a connection with no account id must fail before any request. */
Deno.test("client: refuses to construct without an account id", () => {
  const { ctx, calls } = mockCtx([]);
  assertThrows(() => new BasecampClient(ctx), Error, "reconnect");
  assertEquals(calls.length, 0);
});

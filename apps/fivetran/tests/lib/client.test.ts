import { assert, assertEquals, assertRejects } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import {
  API_VERSION,
  compact,
  csv,
  describeError,
  FivetranClient,
  isoTimestamp,
  json,
  query,
} from "../../lib/client.ts";

const ok = (data: unknown) => ({ status: 200, body: { code: "Success", data } });
const page = (items: unknown[], next: string | null = null) => ok({ items, next_cursor: next });

Deno.test("compact: drops unset keys so an update does not clear untouched fields", () => {
  assertEquals(compact({ a: 1, b: undefined, c: null, d: "", e: [], f: false }), {
    a: 1,
    f: false,
  });
});

Deno.test("query: keeps numbers and booleans, drops blanks", () => {
  assertEquals(query({ a: 1, b: false, c: "x", d: "", e: undefined }), { a: 1, b: false, c: "x" });
});

Deno.test("csv: splits, trims and drops empties; blank means unset", () => {
  assertEquals(csv("a, b ,,c"), ["a", "b", "c"]);
  assertEquals(csv(""), undefined);
});

Deno.test("json: parses text and names the bad field", () => {
  assertEquals(json('{"a":1}', "scope"), { a: 1 });
  try {
    json("{oops", "scope");
    throw new Error("expected a throw");
  } catch (err) {
    assert(String(err).includes("`scope`"), String(err));
  }
});

Deno.test("isoTimestamp: normalises a date and refuses a non-date by field name", () => {
  assertEquals(isoTimestamp("2026-08-18T12:00:00Z", "startTime"), "2026-08-18T12:00:00.000Z");
  assertEquals(isoTimestamp("", "startTime"), undefined);
  try {
    isoTimestamp("last week", "startTime");
    throw new Error("expected a throw");
  } catch (err) {
    assert(String(err).includes("`startTime`"), String(err));
  }
});

/** Fivetran answers 406 for an Accept header it does not recognise. */
Deno.test("client: pins the versioned Accept header on every request", async () => {
  const { ctx, calls } = mockCtx([ok({ id: "g1" })]);
  await new FivetranClient(ctx).request("/v1/groups/g1");
  assertEquals(calls[0].url, "https://api.fivetran.com/v1/groups/g1");
  assertEquals(calls[0].headers["accept"], API_VERSION);
  assert(API_VERSION.includes("version=2"), API_VERSION);
  assertEquals(calls[0].headers["authorization"], undefined);
});

/** The envelope is `{code, message, data}` and actions should never see it. */
Deno.test("client: unwraps the response envelope", async () => {
  const { ctx } = mockCtx([ok({ id: "c1", schema: "shop" })]);
  assertEquals(await new FivetranClient(ctx).request("/v1/connections/c1"), {
    id: "c1",
    schema: "shop",
  });
});

Deno.test("client: raw exposes the headers alongside the data", async () => {
  const { ctx } = mockCtx([{
    status: 200,
    headers: { "content-type": "application/json", "x-rate-limit": "20000" },
    body: { code: "Success", data: { id: "a" } },
  }]);
  const { data, headers } = await new FivetranClient(ctx).raw<{ id: string }>("/v1/account/info");
  assertEquals(data.id, "a");
  assertEquals(headers.get("x-rate-limit"), "20000");
});

Deno.test("client: page unwraps items and the cursor", async () => {
  const { ctx } = mockCtx([page([{ id: "c1" }], "cur1")]);
  const result = await new FivetranClient(ctx).page("/v1/connections");
  assertEquals(result.items, [{ id: "c1" }]);
  assertEquals(result.nextCursor, "cur1");
});

Deno.test("client: pageAll follows the cursor to the end", async () => {
  const { ctx, calls } = mockCtx([page([{ id: "a" }], "cur1"), page([{ id: "b" }])]);
  const result = await new FivetranClient(ctx).pageAll("/v1/connections");
  assertEquals(result.items.length, 2);
  assertEquals(new URL(calls[1].url).searchParams.get("cursor"), "cur1");
});

Deno.test("client: pageAll stops at the page ceiling", async () => {
  const { ctx, calls } = mockCtx([page([{ id: "a" }], "c1"), page([{ id: "b" }], "c2")]);
  const result = await new FivetranClient(ctx).pageAll("/v1/connections", {}, Infinity, 2);
  assertEquals(calls.length, 2);
  assertEquals(result.items.length, 2);
});

Deno.test("client: pageAll asks for at most Fivetran's maximum page size", async () => {
  const { ctx, calls } = mockCtx([page([])]);
  await new FivetranClient(ctx).pageAll("/v1/connections", {}, 5000);
  assertEquals(new URL(calls[0].url).searchParams.get("limit"), "1000");
});

/** The Accept-header failure is otherwise baffling. */
Deno.test("describeError: a 406 points at the Accept header", () => {
  const out = describeError(406, "{}");
  assert(/Accept header/.test(out), out);
  assert(out.includes(API_VERSION), out);
});

/** A 409 on re-sync means "already syncing", not "broken". */
Deno.test("describeError: a 409 says a sync is already running", () => {
  const out = describeError(409, JSON.stringify({ code: "Conflict", message: "Sync in progress" }));
  assert(/already running/.test(out), out);
  assert(/declines a re-sync rather than queueing/.test(out), out);
});

/** A trial account is forty times tighter, which is the usual surprise. */
Deno.test("describeError: a 429 reports the retry and names the trial cap", () => {
  const headers = new Headers({ "retry-after": "60", "x-rate-limit": "500" });
  const out = describeError(429, "{}", headers);
  assert(/retry after 60s/.test(out), out);
  assert(/limit 500\/hour/.test(out), out);
  assert(/40 times tighter/.test(out), out);
});

Deno.test("describeError: a 401 names the three kinds of key", () => {
  assert(/system keys/.test(describeError(401, "{}")));
});

Deno.test("client: an error carries the method, the path and Fivetran's message", async () => {
  const { ctx } = mockCtx([{
    status: 404,
    body: { code: "NotFound_Connector", message: "Connector not found" },
  }]);
  await assertRejects(
    async () => await new FivetranClient(ctx).request("/v1/connections/nope"),
    Error,
    "Fivetran 404 for GET /v1/connections/nope: Connector not found (NotFound_Connector)",
  );
});

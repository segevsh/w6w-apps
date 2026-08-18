import { assert, assertEquals, assertRejects } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import {
  API_VERSION,
  AshbyClient,
  compact,
  csv,
  describeHttpError,
  epochMillis,
  json,
} from "../../lib/client.ts";

const ok = (results: unknown, extra: Record<string, unknown> = {}) => ({
  status: 200,
  body: { success: true, results, ...extra },
});

Deno.test("compact: drops unset keys so an update does not clear untouched fields", () => {
  assertEquals(compact({ a: 1, b: undefined, c: null, d: "", e: [], f: false }), {
    a: 1,
    f: false,
  });
});

Deno.test("csv: splits, trims and drops empties; blank means unset", () => {
  assertEquals(csv("a, b ,,c"), ["a", "b", "c"]);
  assertEquals(csv(""), undefined);
});

Deno.test("json: parses text, passes live values, and names the bad field", () => {
  assertEquals(json('{"a":1}', "location"), { a: 1 });
  assertEquals(json({ a: 1 }, "location"), { a: 1 });
  try {
    json("{oops", "location");
    throw new Error("expected a throw");
  } catch (err) {
    assert(String(err).includes("`location`"), String(err));
  }
});

/**
 * Ashby uses Unix milliseconds for FILTERS and ISO strings for values you set —
 * in the same API. An ISO string in a filter is coerced rather than rejected,
 * so it matches nothing, quietly.
 */
Deno.test("epochMillis: converts a date to milliseconds and passes numbers through", () => {
  assertEquals(epochMillis("2026-08-18T12:00:00Z", "createdAfter"), 1787054400000);
  assertEquals(epochMillis(1787054400000, "createdAfter"), 1787054400000);
  assertEquals(epochMillis("1787054400000", "createdAfter"), 1787054400000);
  assertEquals(epochMillis("", "createdAfter"), undefined);
});

Deno.test("epochMillis: refuses something that is not a date, by field name", () => {
  try {
    epochMillis("last tuesday", "createdAfter");
    throw new Error("expected a throw");
  } catch (err) {
    assert(String(err).includes("`createdAfter`"), String(err));
  }
});

/** Everything is POST with a JSON body — there is no query string at all. */
Deno.test("client: POSTs to the endpoint with the pinned Accept version", async () => {
  const { ctx, calls } = mockCtx([ok({ id: "c1" })]);
  assertEquals(await new AshbyClient(ctx).request("candidate.info", { body: { id: "c1" } }), {
    id: "c1",
  });
  assertEquals(calls[0].url, "https://api.ashbyhq.com/candidate.info");
  assertEquals(calls[0].method, "POST");
  assertEquals(calls[0].headers["accept"], API_VERSION);
  assertEquals(JSON.parse(calls[0].body!), { id: "c1" });
  assertEquals(calls[0].headers["authorization"], undefined);
});

Deno.test("client: a bodyless call still sends an empty JSON object", async () => {
  const { ctx, calls } = mockCtx([ok({})]);
  await new AshbyClient(ctx).request("apiKey.info");
  assertEquals(calls[0].body, "{}");
});

/**
 * THE convention this whole app is built around: Ashby answers what would be a
 * 4xx with `200` and `success: false`, so a client branching on `res.ok`
 * reports every business failure as a success.
 */
Deno.test("client: a 200 with success:false is an error, not a result", async () => {
  const { ctx } = mockCtx([{
    status: 200,
    body: {
      success: false,
      errorInfo: {
        code: "application_not_found",
        message: "Application not found",
        requestId: "01JSJ8FEK5ZN4XQBZP7DBKK7ZC",
      },
    },
  }]);
  await assertRejects(
    async () => await new AshbyClient(ctx).request("application.info"),
    Error,
    "Ashby refused application.info: Application not found (application_not_found) " +
      "[requestId 01JSJ8FEK5ZN4XQBZP7DBKK7ZC]",
  );
});

Deno.test("client: a failure with only a code still produces a readable error", async () => {
  const { ctx } = mockCtx([{ status: 200, body: { success: false, errorInfo: { code: "nope" } } }]);
  await assertRejects(
    async () => await new AshbyClient(ctx).request("candidate.info"),
    Error,
    "nope",
  );
});

/** Dropping warnings is how a partially-applied write looks like a clean one. */
Deno.test("client: warnings are surfaced to the log rather than swallowed", async () => {
  const { ctx, logs } = mockCtx([ok({ id: "a1" }, { warnings: ["unable_to_add_metadata"] })]);
  await new AshbyClient(ctx).request("application.create");
  const warning = logs.find((l) => l.level === "warn");
  assert(warning, "no warning logged");
  assertEquals(warning!.data, { warnings: ["unable_to_add_metadata"] });
});

/** 401 and 403 are different problems with different fixes. */
Deno.test("describeHttpError: 401 is a missing key, 403 is a scope or a dead key", () => {
  assert(/no API key reached/.test(describeHttpError(401, "Unauthorized")));
  const forbidden = describeHttpError(403, "Forbidden");
  assert(/deactivated/.test(forbidden), forbidden);
  assert(/scopes keys per module/.test(forbidden), forbidden);
});

Deno.test("describeHttpError: 429 names the report-endpoint limit", () => {
  assert(/15 requests per minute/.test(describeHttpError(429, "")));
});

Deno.test("client: a transport failure carries the endpoint and status", async () => {
  const { ctx } = mockCtx([{ status: 403, body: "Forbidden" }]);
  await assertRejects(
    async () => await new AshbyClient(ctx).request("candidate.list"),
    Error,
    "Ashby 403 for candidate.list",
  );
});

Deno.test("client: a non-JSON body is reported as such rather than crashing", async () => {
  const { ctx } = mockCtx([{ status: 200, body: "<html>maintenance</html>" }]);
  await assertRejects(
    async () => await new AshbyClient(ctx).request("candidate.list"),
    Error,
    "non-JSON body",
  );
});

Deno.test("client: page returns the items, cursor and paging flags", async () => {
  const { ctx } = mockCtx([
    ok([{ id: "c1" }], { moreDataAvailable: true, nextCursor: "Rl" }),
  ]);
  const page = await new AshbyClient(ctx).page("candidate.list");
  assertEquals(page.items, [{ id: "c1" }]);
  assertEquals(page.nextCursor, "Rl");
  assertEquals(page.moreDataAvailable, true);
});

Deno.test("client: pageAll follows the cursor to the end", async () => {
  const { ctx, calls } = mockCtx([
    ok([{ id: "c1" }], { moreDataAvailable: true, nextCursor: "Rl" }),
    ok([{ id: "c2" }], { moreDataAvailable: false, syncToken: "Rld2D" }),
  ]);
  const page = await new AshbyClient(ctx).pageAll("candidate.list");
  assertEquals(page.items.length, 2);
  assertEquals(JSON.parse(calls[1].body!).cursor, "Rl");
  assertEquals(page.syncToken, "Rld2D");
});

/**
 * The sync token arrives on the LAST page only, so a walk cut short has none —
 * and pretending otherwise would silently skip records next run.
 */
Deno.test("client: a truncated walk returns no sync token", async () => {
  const { ctx } = mockCtx([
    ok([{ id: "c1" }, { id: "c2" }], { moreDataAvailable: true, nextCursor: "Rl", syncToken: "X" }),
  ]);
  const page = await new AshbyClient(ctx).pageAll("candidate.list", {}, 2);
  assertEquals(page.items.length, 2);
  assertEquals(page.syncToken, undefined);
  assertEquals(page.moreDataAvailable, true);
});

Deno.test("client: pageAll stops at the page ceiling", async () => {
  const { ctx, calls } = mockCtx([
    ok([{ id: "a" }], { moreDataAvailable: true, nextCursor: "1" }),
    ok([{ id: "b" }], { moreDataAvailable: true, nextCursor: "2" }),
  ]);
  const page = await new AshbyClient(ctx).pageAll("candidate.list", {}, Infinity, 2);
  assertEquals(calls.length, 2);
  assertEquals(page.items.length, 2);
  assertEquals(page.syncToken, undefined);
});

Deno.test("client: pageAll never asks for more than Ashby's page cap of 100", async () => {
  const { ctx, calls } = mockCtx([ok([], { moreDataAvailable: false })]);
  await new AshbyClient(ctx).pageAll("candidate.list", {}, 500);
  assertEquals(JSON.parse(calls[0].body!).limit, 100);
});

import { assert, assertEquals, assertRejects, assertThrows } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import {
  ADMIN_API,
  compact,
  csv,
  DATA_API,
  GoogleAnalyticsClient,
  json,
  named,
  normalizePropertyId,
  resolveProperty,
} from "../../lib/client.ts";

Deno.test("normalizePropertyId: accepts every shape a person pastes", () => {
  assertEquals(normalizePropertyId("123456789"), "123456789");
  assertEquals(normalizePropertyId("properties/123456789"), "123456789");
  assertEquals(normalizePropertyId("  properties/123456789/  "), "123456789");
});

Deno.test("normalizePropertyId: rejects a non-numeric id instead of building a bad URL", () => {
  const err = assertThrows(() => normalizePropertyId("G-ABC123"), Error);
  assert(err.message.includes("numeric"), err.message);
  assertThrows(() => normalizePropertyId(""), Error);
});

Deno.test("resolveProperty: the action's override wins over the connection's", () => {
  const conn = { display: { propertyId: "111" } } as never;
  assertEquals(resolveProperty(conn), "111");
  assertEquals(resolveProperty(conn, "222"), "222");
  assertEquals(resolveProperty(conn, "  "), "111");
});

Deno.test("resolveProperty: neither one is a directive error", () => {
  const err = assertThrows(() => resolveProperty({ display: {} } as never), Error);
  assert(err.message.includes("propertyId"), err.message);
});

Deno.test("compact: drops unset keys and empty arrays, keeps false and zero", () => {
  assertEquals(compact({ a: 1, b: undefined, c: null, d: "", e: false, f: 0, g: [] }), {
    a: 1,
    e: false,
    f: 0,
  });
});

Deno.test("csv: takes a comma string or a live array", () => {
  assertEquals(csv("date, country"), ["date", "country"]);
  assertEquals(csv(["date", " country "]), ["date", "country"]);
  assertEquals(csv(""), undefined);
  assertEquals(csv([]), undefined);
});

Deno.test("named: expands names into GA4's [{name}] arrays", () => {
  assertEquals(named(["date", "country"]), [{ name: "date" }, { name: "country" }]);
  assertEquals(named(undefined), undefined);
});

Deno.test("json: parses a string param and names a bad one", () => {
  assertEquals(json('{"a":1}', "dimensionFilter"), { a: 1 });
  assertEquals(json({ a: 1 }, "dimensionFilter"), { a: 1 });
  assertEquals(json("", "dimensionFilter"), undefined);
  const err = assertThrows(() => json("{oops", "orderBys"), Error);
  assert(err.message.includes("orderBys"), err.message);
});

Deno.test("client: data and admin calls go to their own hosts", async () => {
  const { ctx, calls } = mockCtx([{ status: 200, body: {} }, { status: 200, body: {} }], {
    display: { propertyId: "1" },
  });
  const client = new GoogleAnalyticsClient(ctx);
  await client.data("/properties/1:runReport", { method: "POST", body: {} });
  await client.admin("/properties/1");
  assertEquals(calls[0].url, `${DATA_API}/properties/1:runReport`);
  assertEquals(calls[1].url, `${ADMIN_API}/properties/1`);
});

Deno.test("client: never sends an Authorization header — signing is the host's job", async () => {
  const { ctx, calls } = mockCtx([{ status: 200, body: {} }], { display: {} });
  await new GoogleAnalyticsClient(ctx).admin("/accountSummaries");
  assertEquals(calls[0].headers["authorization"], undefined);
  assertEquals(calls[0].headers["accept"], "application/json");
});

Deno.test("client: a failure surfaces the status and Google's error envelope", async () => {
  const { ctx } = mockCtx([{
    status: 400,
    body: { error: { code: 400, message: "Field metrics[0] had an invalid value" } },
  }], { display: {} });
  const err = await assertRejects(
    async () => await new GoogleAnalyticsClient(ctx).data("/properties/1:runReport"),
    Error,
  );
  assert(err.message.includes("400"), err.message);
  assert(err.message.includes("invalid value"), err.message);
});

Deno.test("client: adminAll follows nextPageToken until it is absent", async () => {
  const { ctx, calls } = mockCtx([
    { status: 200, body: { accounts: [{ name: "accounts/1" }], nextPageToken: "t2" } },
    { status: 200, body: { accounts: [{ name: "accounts/2" }] } },
  ], { display: {} });

  const items = await new GoogleAnalyticsClient(ctx).adminAll("/accounts", "accounts");
  assertEquals(items, [{ name: "accounts/1" }, { name: "accounts/2" }]);
  assertEquals(new URL(calls[0].url).searchParams.get("pageToken"), null);
  assertEquals(new URL(calls[0].url).searchParams.get("pageSize"), "200");
  assertEquals(new URL(calls[1].url).searchParams.get("pageToken"), "t2");
});

Deno.test("client: adminAll stops at wantTotal even with a next page waiting", async () => {
  const { ctx, calls } = mockCtx([
    { status: 200, body: { accounts: [{ id: 1 }, { id: 2 }, { id: 3 }], nextPageToken: "t2" } },
  ], { display: {} });
  const items = await new GoogleAnalyticsClient(ctx).adminAll("/accounts", "accounts", {}, 2);
  assertEquals(items, [{ id: 1 }, { id: 2 }]);
  assertEquals(calls.length, 1);
});

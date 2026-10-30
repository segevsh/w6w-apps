import { test } from "node:test";
import { assert, assertEquals, assertThrows } from "../_assert.ts";
import { mockQbCtx } from "../_helpers.ts";
import action from "../../actions/list-tables.ts";

test("list-tables: GETs /tables with appId as a QUERY param", async () => {
  // Not /apps/{appId}/tables — the app is a query parameter.
  const { ctx, calls } = mockQbCtx([{ body: [] }]);
  await action.execute({}, ctx);

  assertEquals(calls[0].method, "GET");
  const url = new URL(calls[0].url);
  assertEquals(url.pathname, "/v1/tables");
  assertEquals(url.searchParams.get("appId"), "bqrapp1");
});

test("list-tables: an explicit appId overrides the connection default", async () => {
  const { ctx, calls } = mockQbCtx([{ body: [] }]);
  await action.execute({ appId: "bqrother" }, ctx);
  assertEquals(new URL(calls[0].url).searchParams.get("appId"), "bqrother");
});

test("list-tables: errors when no app id is available at all", () => {
  const { ctx, calls } = mockQbCtx([], { realm: "acme.quickbase.com" });
  assertThrows(() => action.execute({}, ctx), Error);
  assertEquals(calls.length, 0);
});

test("list-tables: returns the bare array Quickbase sends", async () => {
  const { ctx } = mockQbCtx([{ body: [{ id: "bck1", name: "Customers", keyFieldId: 3 }] }]);
  const out = await action.execute({}, ctx);
  assert(Array.isArray(out));
  assertEquals(out[0].keyFieldId, 3);
});

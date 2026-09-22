import { assertEquals } from "@std/assert";
import { mockConnectedCtx, pathOf } from "../_helpers.ts";
import action from "../../actions/list-collections.ts";

/** Shape taken from the Collections "List Collections" 200 response. */
const collections = [
  {
    name: "Team",
    item_count: 2,
    regular_page_bindable: true,
    customer_lock: "unlocked",
    base_refresh_interval: "PT1H",
    fields: [{ name: "Name", type: "TEXT", multi_select_options: [] }],
    values: [{ id: "row-1", page_item_url: "/team/ada", data: { Name: "Ada" } }],
  },
];

Deno.test("list-collections: GETs the site's collection list and returns the bare array", async () => {
  const { ctx, calls } = mockConnectedCtx([{ body: collections }]);
  const result = await action.execute!({ siteName: "abc1234d" }, ctx) as typeof collections;

  assertEquals(calls[0].method, "GET");
  assertEquals(pathOf(calls[0].url), "/api/sites/multiscreen/abc1234d/collection");
  assertEquals(result.length, 1);
  assertEquals(result[0].item_count, 2);
  assertEquals(result[0].values[0].id, "row-1");
});

/**
 * The Collections pages are a different OpenAPI document from the Partner API
 * one, and they do not use the pagination envelope — a check that keys off
 * `total_responses` would be wrong here.
 */
Deno.test("list-collections: no pagination envelope is expected or unwrapped", async () => {
  const { ctx, calls } = mockConnectedCtx([{ body: collections }]);
  const result = await action.execute!({ siteName: "abc" }, ctx);
  assertEquals(Array.isArray(result), true);
  assertEquals(typeof (result as { total_responses?: unknown }).total_responses, "undefined");
  assertEquals(calls[0].headers["accept"], "application/json");
});

Deno.test("list-collections: surfaces Duda's error body on a 400", async () => {
  const { ctx } = mockConnectedCtx([{
    status: 400,
    body: { error_code: "ResourceNotExist", message: "Site with alias 'abc' doesn't exist" },
  }]);
  const err = await Promise.resolve(action.execute!({ siteName: "abc" }, ctx)).catch((e: Error) =>
    e
  );
  assertEquals(
    (err as Error).message,
    "Duda 400 for GET /api/sites/multiscreen/abc/collection: ResourceNotExist: Site with alias 'abc' doesn't exist",
  );
});

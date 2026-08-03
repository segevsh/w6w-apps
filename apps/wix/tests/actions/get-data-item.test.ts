import { assertEquals } from "@std/assert";
import action from "../../actions/get-data-item.ts";
import { mockCtx } from "../_helpers.ts";

Deno.test("get-data-item: GETs the item and carries the collection id as a query param", async () => {
  const { ctx, calls } = mockCtx([{ body: { dataItem: { _id: "abc" } } }]);
  await action.execute!({ dataItemId: "abc", dataCollectionId: "Cities" }, ctx);
  const url = new URL(calls[0].url);
  assertEquals(calls[0].method, "GET");
  assertEquals(url.pathname, "/wix-data/v2/items/abc");
  assertEquals(url.searchParams.get("dataCollectionId"), "Cities");
  assertEquals(calls[0].body, null);
});

Deno.test("get-data-item: percent-encodes the item id", async () => {
  const { ctx, calls } = mockCtx([{ body: {} }]);
  await action.execute!({ dataItemId: "a/b c", dataCollectionId: "Cities" }, ctx);
  assertEquals(new URL(calls[0].url).pathname, "/wix-data/v2/items/a%2Fb%20c");
});

Deno.test("get-data-item: forwards consistentRead only when set", async () => {
  const { ctx, calls } = mockCtx([{ body: {} }, { body: {} }]);
  await action.execute!({ dataItemId: "a", dataCollectionId: "C" }, ctx);
  assertEquals(new URL(calls[0].url).searchParams.get("consistentRead"), null);
  await action.execute!({ dataItemId: "a", dataCollectionId: "C", consistentRead: true }, ctx);
  assertEquals(new URL(calls[1].url).searchParams.get("consistentRead"), "true");
});

Deno.test("get-data-item: is a read action returning the body", async () => {
  const body = { dataItem: { _id: "abc", data: { name: "Ada" } } };
  const { ctx } = mockCtx([{ body }]);
  assertEquals(await action.execute!({ dataItemId: "abc", dataCollectionId: "C" }, ctx), body);
  assertEquals(action.type, "read");
});

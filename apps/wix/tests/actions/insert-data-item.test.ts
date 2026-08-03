import { assert, assertEquals } from "@std/assert";
import action from "../../actions/insert-data-item.ts";
import { mockCtx } from "../_helpers.ts";

Deno.test("insert-data-item: POSTs /wix-data/v2/items wrapping data under `dataItem`", async () => {
  const { ctx, calls } = mockCtx([{ body: { dataItem: { _id: "1" } } }]);
  await action.execute!({ dataCollectionId: "Cities", data: { name: "Paris" } }, ctx);
  assertEquals(calls[0].method, "POST");
  assertEquals(new URL(calls[0].url).pathname, "/wix-data/v2/items");
  assertEquals(JSON.parse(calls[0].body!), {
    dataCollectionId: "Cities",
    dataItem: { data: { name: "Paris" } },
  });
  assertEquals(calls[0].headers["content-type"], "application/json");
});

Deno.test("insert-data-item: omits the id key entirely when none is supplied", async () => {
  const { ctx, calls } = mockCtx([{ body: {} }]);
  await action.execute!({ dataCollectionId: "C", data: {} }, ctx);
  assert(!("id" in JSON.parse(calls[0].body!).dataItem));
});

Deno.test("insert-data-item: sends an explicit id when supplied, making a retry safe", async () => {
  const { ctx, calls } = mockCtx([{ body: {} }]);
  await action.execute!({ dataCollectionId: "C", data: { a: 1 }, dataItemId: "run-42" }, ctx);
  assertEquals(JSON.parse(calls[0].body!).dataItem, { id: "run-42", data: { a: 1 } });
});

Deno.test("insert-data-item: is a non-idempotent perform action", () => {
  assertEquals(action.type, "perform");
  assertEquals(action.idempotent, false);
});

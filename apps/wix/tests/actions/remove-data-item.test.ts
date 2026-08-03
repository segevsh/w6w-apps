import { assertEquals } from "@std/assert";
import action from "../../actions/remove-data-item.ts";
import { mockCtx } from "../_helpers.ts";

Deno.test("remove-data-item: DELETEs the item with the collection id as a query param", async () => {
  const { ctx, calls } = mockCtx([{ body: { dataItem: {} } }]);
  await action.execute!({ dataItemId: "abc", dataCollectionId: "Cities" }, ctx);
  const url = new URL(calls[0].url);
  assertEquals(calls[0].method, "DELETE");
  assertEquals(url.pathname, "/wix-data/v2/items/abc");
  assertEquals(url.searchParams.get("dataCollectionId"), "Cities");
});

Deno.test("remove-data-item: logs what it is about to destroy", async () => {
  const { ctx, logs } = mockCtx([{ body: {} }]);
  await action.execute!({ dataItemId: "abc", dataCollectionId: "Cities" }, ctx);
  assertEquals(logs[0].level, "info");
  assertEquals(logs[0].data, { dataCollectionId: "Cities", dataItemId: "abc" });
});

Deno.test("remove-data-item: tolerates a 204 with no body", async () => {
  const { ctx } = mockCtx([{ status: 204 }]);
  assertEquals(await action.execute!({ dataItemId: "a", dataCollectionId: "C" }, ctx), undefined);
});

Deno.test("remove-data-item: is an idempotent perform action", () => {
  assertEquals(action.type, "perform");
  assertEquals(action.idempotent, true);
});

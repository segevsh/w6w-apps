import { assertEquals } from "@std/assert";
import action from "../../actions/update-data-item.ts";
import { mockCtx } from "../_helpers.ts";

Deno.test("update-data-item: PUTs to the item path with the id echoed in the body", async () => {
  const { ctx, calls } = mockCtx([{ body: { dataItem: {} } }]);
  await action.execute!(
    { dataCollectionId: "Cities", dataItemId: "abc", data: { name: "Lyon" } },
    ctx,
  );
  assertEquals(calls[0].method, "PUT");
  assertEquals(new URL(calls[0].url).pathname, "/wix-data/v2/items/abc");
  assertEquals(JSON.parse(calls[0].body!), {
    dataCollectionId: "Cities",
    dataItem: { id: "abc", data: { name: "Lyon" } },
  });
});

Deno.test("update-data-item: percent-encodes the item id in the path", async () => {
  const { ctx, calls } = mockCtx([{ body: {} }]);
  await action.execute!({ dataCollectionId: "C", dataItemId: "a b", data: {} }, ctx);
  assertEquals(new URL(calls[0].url).pathname, "/wix-data/v2/items/a%20b");
});

Deno.test("update-data-item: is an idempotent perform action", () => {
  assertEquals(action.type, "perform");
  assertEquals(action.idempotent, true);
});

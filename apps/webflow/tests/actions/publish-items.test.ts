import { assertEquals } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/publish-items.ts";

Deno.test("publish-items: POSTs itemIds to /v2/collections/{id}/items/publish", async () => {
  const body = { publishedItemIds: ["i1", "i2"], errors: [] };
  const { ctx, calls } = mockCtx([{ body }]);
  const result = await action.execute!({ collectionId: "c1", itemIds: ["i1", "i2"] }, ctx);
  assertEquals(new URL(calls[0].url).pathname, "/v2/collections/c1/items/publish");
  assertEquals(calls[0].method, "POST");
  assertEquals(JSON.parse(calls[0].body!), { itemIds: ["i1", "i2"] });
  assertEquals(result, body);
});

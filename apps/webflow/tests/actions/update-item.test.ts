import { assertEquals } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/update-item.ts";

Deno.test("update-item: PATCHes /v2/collections/{id}/items/{itemId}", async () => {
  const { ctx, calls } = mockCtx([{ body: { id: "i1" } }]);
  await action.execute!(
    { collectionId: "c1", itemId: "i1", fieldData: { name: "New" } },
    ctx,
  );
  assertEquals(new URL(calls[0].url).pathname, "/v2/collections/c1/items/i1");
  assertEquals(calls[0].method, "PATCH");
  assertEquals(JSON.parse(calls[0].body!), { fieldData: { name: "New" } });
});

Deno.test("update-item: targets the /live variant when live is set", async () => {
  const { ctx, calls } = mockCtx([{ body: { id: "i1" } }]);
  await action.execute!(
    { collectionId: "c1", itemId: "i1", fieldData: { name: "New" }, live: true },
    ctx,
  );
  assertEquals(new URL(calls[0].url).pathname, "/v2/collections/c1/items/i1/live");
});

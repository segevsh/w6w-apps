import { test } from "node:test";
import { assertEquals } from "../_assert.ts";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/create-item.ts";

test("create-item: POSTs fieldData to /v2/collections/{id}/items (staged)", async () => {
  const { ctx, calls } = mockCtx([{ body: { id: "i1" } }]);
  await action.execute!(
    { collectionId: "c1", fieldData: { name: "Hi", slug: "hi" }, isDraft: true },
    ctx,
  );
  assertEquals(new URL(calls[0].url).pathname, "/v2/collections/c1/items");
  assertEquals(calls[0].method, "POST");
  assertEquals(JSON.parse(calls[0].body!), {
    fieldData: { name: "Hi", slug: "hi" },
    isDraft: true,
  });
});

test("create-item: uses the /live variant when live is set", async () => {
  const { ctx, calls } = mockCtx([{ body: { id: "i1" } }]);
  await action.execute!({ collectionId: "c1", fieldData: { name: "Hi" }, live: true }, ctx);
  assertEquals(new URL(calls[0].url).pathname, "/v2/collections/c1/items/live");
});

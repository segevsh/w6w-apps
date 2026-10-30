import { test } from "node:test";
import { assertEquals } from "../_assert.ts";
import collectionDelete from "../../actions/collection-delete.ts";
import { envelope, mockCtx, pathOf } from "../_helpers.ts";

test("collection-delete: DELETEs the collection and returns its id", async () => {
  const { ctx, calls } = mockCtx([{ status: 200, body: envelope("col1") }]);
  const out = await collectionDelete.execute({ collectionId: "col1" }, ctx) as {
    collectionId: string;
  };

  assertEquals(calls[0].method, "DELETE");
  assertEquals(pathOf(calls[0].url), "/api/collections/col1");
  assertEquals(out.collectionId, "col1");
});

test("collection-delete: is declared idempotent", () => {
  assertEquals(collectionDelete.idempotent, true);
});

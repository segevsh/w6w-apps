import { test } from "node:test";
import { assertEquals } from "../_assert.ts";
import collectionDelete from "../../actions/collection-delete.ts";
import { mockCtx, pathOf } from "../_helpers.ts";

test("collection-delete: DELETE by id", async () => {
  const { ctx, calls } = mockCtx([{ status: 204, body: undefined }]);
  assertEquals(await collectionDelete.execute({ collection_id: "c" }, ctx), {
    id: "c",
    deleted: true,
  });
  assertEquals(calls[0].method, "DELETE");
  assertEquals(pathOf(calls[0].url), "/collections/c");
});

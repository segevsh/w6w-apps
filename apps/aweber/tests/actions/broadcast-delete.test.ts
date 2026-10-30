import { test } from "node:test";
import { assertEquals } from "../_assert.ts";
import broadcastDelete from "../../actions/broadcast-delete.ts";
import { mockCtx, pathOf } from "../_helpers.ts";

test("broadcast-delete: deletes by id and reports the (204) status", async () => {
  const { ctx, calls } = mockCtx([{ status: 204, body: undefined }]);
  const out = await broadcastDelete.execute(
    { accountId: "1", listId: "2", broadcastId: "1" },
    ctx,
  );

  assertEquals(pathOf(calls[0].url), "/1.0/accounts/1/lists/2/broadcasts/1");
  assertEquals(calls[0].method, "DELETE");
  assertEquals(out, { status: 204 });
});
